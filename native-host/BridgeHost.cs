using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.IO.Pipes;
using System.Security.Cryptography;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web.Script.Serialization;

namespace CloudMusicEdge
{
    internal static class BridgeHost
    {
        private const string Version = "0.3.0";
        private const string QqBaseUrl = "https://a.y.qq.com";
        private const string QqSkillVersion = "0.0.3";
        private static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 8 * 1024 * 1024 };
        private static readonly string AppData = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CloudMusicEdge");
        private static readonly string QqKeyFile = Path.Combine(AppData, "qq.key");
        private static readonly string PlayerStateFile = Path.Combine(AppData, "netease-player.json");
        private static readonly Mutex PlayerStateLock = new Mutex(false, "Local\\CloudMusicEdge.PlayerState");
        private const string PlayerPipeName = "ncm-mpv";
        private static readonly string BaseDirectory = AppDomain.CurrentDomain.BaseDirectory;
        private static readonly Regex EncryptedId = new Regex("^[a-fA-F0-9]{32}$", RegexOptions.Compiled);
        private static readonly Regex NumericId = new Regex("^[0-9]{1,20}$", RegexOptions.Compiled);
        private const uint HandleFlagInherit = 0x00000001;
        private const int StdInputHandle = -10;
        private const int StdOutputHandle = -11;
        private const int StdErrorHandle = -12;

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr GetStdHandle(int handle);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetHandleInformation(IntPtr handle, uint mask, uint flags);

        public static int Main(string[] args)
        {
            if (args.Length == 1 && args[0] == "--version") { Console.WriteLine(Version); return 0; }
            if (args.Length == 1 && args[0] == "--self-test")
            {
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
                Directory.CreateDirectory(AppData);
                Console.WriteLine(Json.Serialize(Doctor()));
                return 0;
            }
            Console.InputEncoding = Encoding.UTF8;
            Console.OutputEncoding = Encoding.UTF8;
            PreventChildHandleInheritance();
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
            Directory.CreateDirectory(AppData);

            Stream input = Console.OpenStandardInput();
            Stream output = Console.OpenStandardOutput();
            try
            {
                while (true)
                {
                    byte[] frame = ReadFrame(input);
                    if (frame == null) return 0;
                    Dictionary<string, object> response;
                    string id = null;
                    try
                    {
                        var request = Json.DeserializeObject(Encoding.UTF8.GetString(frame)) as Dictionary<string, object>;
                        if (request == null) throw new UserError("请求格式无效");
                        id = GetString(request, "id", 128, false);
                        response = Success(id, Dispatch(request));
                    }
                    catch (UserError error)
                    {
                        response = Failure(id, error.Message);
                    }
                    catch (Exception error)
                    {
                        response = Failure(id, "本地桥接执行失败：" + SafeMessage(error.Message));
                    }
                    WriteFrame(output, Encoding.UTF8.GetBytes(Json.Serialize(response)));
                }
            }
            catch (EndOfStreamException) { return 0; }
            catch (IOException) { return 0; }
        }

        private static object Dispatch(Dictionary<string, object> request)
        {
            string action = GetString(request, "action", 80, true);
            var payload = request.ContainsKey("payload") ? request["payload"] as Dictionary<string, object> : null;
            payload = payload ?? new Dictionary<string, object>();

            switch (action)
            {
                case "system.ping": return Map("version", Version, "host", "CloudMusicBridge");
                case "system.doctor": return Doctor();
                case "settings.get": return Map("qqKeyConfigured", File.Exists(QqKeyFile));
                case "settings.setQqKey": return SaveQqKey(payload);
                case "settings.clearQqKey": return ClearQqKey();
                case "netease.search": return NeteaseSearch(payload);
                case "netease.play": return NeteasePlay(payload);
                case "netease.playPlaylist": return NeteasePlayPlaylist(payload);
                case "netease.playlistTracks": return NeteasePlaylistTracks(payload);
                case "netease.queueAdd": return NeteaseQueueAdd(payload);
                case "netease.control": return NeteaseControl(payload);
                case "netease.launchSetup": return LaunchNetease(payload);
                case "qq.search": return QqSearch(payload);
                case "qq.playlistDetail": return QqPlaylistDetail(payload);
                case "qq.test": return QqSearch(new Dictionary<string, object> { { "keyword", "音乐" }, { "type", "song" } });
                case "qq.openKeyPage": return OpenOfficialUrl("https://y.qq.com/n/ryqq_v2/qqmusic_skills");
                default: throw new UserError("不支持的操作");
            }
        }

        private static object Doctor()
        {
            string node = FindExecutable("node.exe");
            string npm = FindExecutable("npm.cmd");
            string mpv = FindExecutable("mpv.exe");
            NcmRuntime ncm = FindNcmRuntime();
            bool ncmInstalled = ncm != null;
            bool loginReady = false;
            string ncmDetail;

            if (!ncmInstalled)
            {
                ncmDetail = node == null ? "缺少 Node.js；请点击设置安装" : "未安装官方 ncm-cli";
            }
            else
            {
                var check = Run(ncm.NodePath, new[] { ncm.ScriptPath, "login", "--check" }, 10000);
                string combined = (check.Stdout + " " + check.Stderr).Trim();
                loginReady = check.ExitCode == 0 && !Regex.IsMatch(combined, "未登录|请先登录|API key 未设置|not logged|unauthorized", RegexOptions.IgnoreCase);
                ncmDetail = loginReady ? (mpv == null ? "已登录，但未检测到 mpv" : "官方 ncm-cli、登录和 mpv 已就绪") : Compact(combined, 160);
                if (Regex.IsMatch(combined, "API key 未设置", RegexOptions.IgnoreCase))
                    ncmDetail = "已安装依赖；请在开放平台创建应用，再配置 App ID、Private Key 并扫码登录";
                if (String.IsNullOrWhiteSpace(ncmDetail)) ncmDetail = "ncm-cli 尚未完成配置或登录";
            }

            bool neteaseReady = ncmInstalled && loginReady && mpv != null;
            bool qqReady = File.Exists(QqKeyFile);
            return Map(
                "version", Version,
                "environment", Map("node", node != null, "npm", npm != null, "ncmCli", ncmInstalled, "mpv", mpv != null),
                "providers", Map(
                    "netease", Map("ready", neteaseReady, "summary", ncmDetail),
                    "qq", Map("ready", qqReady, "summary", qqReady ? "官方 API Key 已加密保存" : "尚未配置 QQ 音乐官方 API Key")
                )
            );
        }

        private static object SaveQqKey(Dictionary<string, object> payload)
        {
            string key = GetString(payload, "key", 256, true);
            if (!key.StartsWith("qmk-", StringComparison.Ordinal) || key.Length < 12)
                throw new UserError("Key 格式不正确，应以 qmk- 开头");
            byte[] clear = Encoding.UTF8.GetBytes(key);
            byte[] encrypted = ProtectedData.Protect(clear, null, DataProtectionScope.CurrentUser);
            Directory.CreateDirectory(AppData);
            File.WriteAllBytes(QqKeyFile, encrypted);
            Array.Clear(clear, 0, clear.Length);
            return Map("configured", true);
        }

        private static object ClearQqKey()
        {
            if (File.Exists(QqKeyFile)) File.Delete(QqKeyFile);
            return Map("configured", false);
        }

        private static string ReadQqKey()
        {
            if (!File.Exists(QqKeyFile)) throw new UserError("请先在设置中保存 QQ 音乐官方 API Key");
            try
            {
                byte[] encrypted = File.ReadAllBytes(QqKeyFile);
                byte[] clear = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
                string key = Encoding.UTF8.GetString(clear);
                Array.Clear(clear, 0, clear.Length);
                return key;
            }
            catch (CryptographicException)
            {
                throw new UserError("QQ API Key 无法由当前 Windows 用户解密，请重新保存");
            }
        }

        private static object NeteaseSearch(Dictionary<string, object> payload)
        {
            string keyword = ValidateKeyword(GetString(payload, "keyword", 100, true));
            string type = GetString(payload, "type", 20, true);
            if (type != "song" && type != "playlist") throw new UserError("不支持的搜索类型");
            return RunNcm(new[] { "search", type, "--keyword", keyword, "--userInput", "在 CloudMusic Edge 中搜索" + keyword }, 25000);
        }

        private static object NeteasePlaylistTracks(Dictionary<string, object> payload)
        {
            string id = RequireEncryptedId(payload, "playlistId");
            return RunNcm(new[] { "playlist", "tracks", "--playlistId", id, "--userInput", "在 CloudMusic Edge 中读取歌单" }, 30000);
        }

        private static object NeteasePlay(Dictionary<string, object> payload)
        {
            string encrypted = RequireEncryptedId(payload, "encryptedId");
            string original = RequireNumericId(payload, "originalId");
            var queue = new ArrayList { Track(encrypted, original, GetString(payload, "title", 200, false), GetString(payload, "meta", 300, false)) };
            SavePlayerState(queue, 0, 50, "loading");
            RunNcm(new[] { "play", "--song", "--encrypted-id", encrypted, "--original-id", original }, 30000);
            WaitForMpv();
            SavePlayerState(queue, 0, 50, "playing");
            return ManagedStateResult(LoadPlayerState(), "开始播放");
        }

        private static object NeteaseQueueAdd(Dictionary<string, object> payload)
        {
            string encrypted = RequireEncryptedId(payload, "encryptedId");
            string original = RequireNumericId(payload, "originalId");
            return RunNcm(new[] { "queue", "add", "--encrypted-id", encrypted, "--original-id", original }, 20000);
        }

        private static object NeteasePlayPlaylist(Dictionary<string, object> payload)
        {
            string encrypted = RequireEncryptedId(payload, "encryptedId");
            string original = RequireNumericId(payload, "originalId");
            var result = RunNcm(new[] { "playlist", "tracks", "--playlistId", encrypted, "--limit", "500" }, 45000) as Dictionary<string, object>;
            var root = result == null ? null : result["payload"] as Dictionary<string, object>;
            object rawData;
            var queue = new ArrayList();
            if (root != null && root.TryGetValue("data", out rawData))
            {
                var items = rawData as IEnumerable;
                if (items != null)
                {
                    foreach (object raw in items)
                    {
                        var item = raw as Dictionary<string, object>;
                        if (item == null || !IsPlayable(item)) continue;
                        string id = Value(item, "id");
                        string originalId = Value(item, "originalId");
                        if (!EncryptedId.IsMatch(id) || !NumericId.IsMatch(originalId)) continue;
                        queue.Add(Track(id, originalId, Value(item, "name"), ArtistNames(item)));
                    }
                }
            }
            if (queue.Count == 0) throw new UserError("歌单中没有可播放的歌曲");
            SavePlayerState(queue, 0, 50, "loading");
            RunNcm(new[] { "play", "--playlist", "--encrypted-id", encrypted, "--original-id", original }, 30000);
            WaitForMpv();
            SavePlayerState(queue, 0, 50, "playing");
            return ManagedStateResult(LoadPlayerState(), "歌单已开始播放");
        }

        private static object NeteaseControl(Dictionary<string, object> payload)
        {
            string name = GetString(payload, "name", 20, true);
            Dictionary<string, object> state = LoadPlayerState();
            switch (name)
            {
                case "pause":
                    SendMpv(new object[] { "set_property", "pause", true });
                    state["status"] = "paused"; SavePlayerState(state); return ManagedStateResult(state, "已暂停");
                case "resume":
                    SendMpv(new object[] { "set_property", "pause", false });
                    state["status"] = "playing"; SavePlayerState(state); return ManagedStateResult(state, "继续播放");
                case "stop":
                    RunNcm(new[] { "stop" }, 12000);
                    state["status"] = "stopped"; state["position"] = 0; SavePlayerState(state); return ManagedStateResult(state, "已停止播放");
                case "next": return MoveManagedTrack(state, 1);
                case "prev": return MoveManagedTrack(state, -1);
                case "state":
                    object pausedValue = GetMpvProperty("pause");
                    bool? paused = pausedValue is bool ? (bool?)pausedValue : null;
                    state["status"] = !paused.HasValue ? "stopped" : paused.Value ? "paused" : "playing";
                    object position = GetMpvProperty("time-pos");
                    object duration = GetMpvProperty("duration");
                    state["position"] = position ?? 0;
                    state["duration"] = duration ?? 0;
                    SavePlayerState(state); return ManagedStateResult(state, "状态已刷新");
                case "seek":
                    int seek = GetInt(payload, "value", 0, 86400);
                    SendMpv(new object[] { "set_property", "time-pos", seek });
                    state["position"] = seek; SavePlayerState(state); return ManagedStateResult(state, "播放进度已调整");
                case "volume":
                    int volume = GetInt(payload, "value", 0, 100);
                    SendMpv(new object[] { "set_property", "volume", volume });
                    state["volume"] = volume; SavePlayerState(state); return ManagedStateResult(state, "音量已调整");
                default: throw new UserError("不支持的播放控制");
            }
        }

        private static void PreventChildHandleInheritance()
        {
            int[] handles = new[] { StdInputHandle, StdOutputHandle, StdErrorHandle };
            foreach (int name in handles)
            {
                IntPtr handle = GetStdHandle(name);
                if (handle != IntPtr.Zero && handle != new IntPtr(-1)) SetHandleInformation(handle, HandleFlagInherit, 0);
            }
        }

        private static Dictionary<string, object> Track(string encryptedId, string originalId, string title, string meta)
        {
            return Map("encryptedId", encryptedId, "originalId", originalId, "title", title, "meta", meta);
        }

        private static string Value(Dictionary<string, object> map, string name, string fallback = "")
        {
            object raw;
            return map != null && map.TryGetValue(name, out raw) && raw != null ? Convert.ToString(raw) : fallback;
        }

        private static bool IsPlayable(Dictionary<string, object> item)
        {
            object raw;
            if (item.TryGetValue("visible", out raw) && raw is bool && !(bool)raw) return false;
            if (item.TryGetValue("playFlag", out raw) && raw is bool && !(bool)raw) return false;
            return !String.Equals(Value(item, "plLevel"), "none", StringComparison.OrdinalIgnoreCase);
        }

        private static string ArtistNames(Dictionary<string, object> item)
        {
            object raw;
            if (!item.TryGetValue("artists", out raw)) item.TryGetValue("fullArtists", out raw);
            var artists = raw as IEnumerable;
            if (artists == null) return Value(item, "artistName");
            var names = new List<string>();
            foreach (object artist in artists)
            {
                var map = artist as Dictionary<string, object>;
                string name = Value(map, "name");
                if (!String.IsNullOrWhiteSpace(name)) names.Add(name);
            }
            return String.Join(" / ", names.ToArray());
        }

        private static Dictionary<string, object> LoadPlayerState()
        {
            try
            {
                if (File.Exists(PlayerStateFile))
                {
                    var parsed = Json.DeserializeObject(File.ReadAllText(PlayerStateFile, Encoding.UTF8)) as Dictionary<string, object>;
                    if (parsed != null) return parsed;
                }
            }
            catch { }
            return Map("queue", new ArrayList(), "currentIndex", 0, "volume", 50, "status", "stopped", "title", "", "meta", "");
        }

        private static void SavePlayerState(ArrayList queue, int index, int volume, string status)
        {
            var track = queue[index] as Dictionary<string, object>;
            SavePlayerState(Map("queue", queue, "currentIndex", index, "volume", volume, "status", status,
                "title", Value(track, "title"), "meta", Value(track, "meta")));
        }

        private static void SavePlayerState(Dictionary<string, object> state)
        {
            Directory.CreateDirectory(AppData);
            bool locked = false;
            string temporary = PlayerStateFile + "." + Process.GetCurrentProcess().Id + ".tmp";
            try
            {
                locked = PlayerStateLock.WaitOne(5000);
                if (!locked) throw new UserError("播放器状态正忙，请重试");
                File.WriteAllText(temporary, Json.Serialize(state), new UTF8Encoding(false));
                if (File.Exists(PlayerStateFile)) File.Replace(temporary, PlayerStateFile, null);
                else File.Move(temporary, PlayerStateFile);
            }
            finally
            {
                try { if (File.Exists(temporary)) File.Delete(temporary); } catch { }
                if (locked) PlayerStateLock.ReleaseMutex();
            }
        }

        private static object MoveManagedTrack(Dictionary<string, object> state, int delta)
        {
            var queue = new ArrayList();
            object rawQueue;
            var items = state.TryGetValue("queue", out rawQueue) ? rawQueue as IEnumerable : null;
            if (items != null) foreach (object item in items) queue.Add(item);
            if (queue.Count == 0) throw new UserError("当前播放队列为空");
            int index;
            if (!Int32.TryParse(Value(state, "currentIndex", "0"), out index)) index = 0;
            index = (index + delta + queue.Count) % queue.Count;
            int volume;
            if (!Int32.TryParse(Value(state, "volume", "50"), out volume)) volume = 50;
            RunNcm(new[] { delta > 0 ? "next" : "prev" }, 12000);
            SavePlayerState(queue, index, volume, "playing");
            return ManagedStateResult(LoadPlayerState(), delta > 0 ? "下一首" : "上一首");
        }

        private static void WaitForMpv()
        {
            for (int i = 0; i < 50; i++)
            {
                if (IsMpvReady()) return;
                Thread.Sleep(100);
            }
            throw new UserError("官方播放器尚未就绪，请重试一次");
        }

        private static bool TrySendMpv(object[] command)
        {
            try
            {
                using (var pipe = new NamedPipeClientStream(".", PlayerPipeName, PipeDirection.InOut))
                {
                    pipe.Connect(800);
                    byte[] message = Encoding.UTF8.GetBytes(Json.Serialize(Map("command", command)) + "\n");
                    pipe.Write(message, 0, message.Length);
                    pipe.Flush();
                    using (var reader = new StreamReader(pipe, Encoding.UTF8, false, 1024, true))
                    {
                        var pending = reader.ReadLineAsync();
                        if (!pending.Wait(1500) || String.IsNullOrWhiteSpace(pending.Result)) return false;
                        var response = Json.DeserializeObject(pending.Result) as Dictionary<string, object>;
                        return response != null && String.Equals(Value(response, "error"), "success", StringComparison.OrdinalIgnoreCase);
                    }
                }
            }
            catch { return false; }
        }

        private static object GetMpvProperty(string name)
        {
            try
            {
                using (var pipe = new NamedPipeClientStream(".", PlayerPipeName, PipeDirection.InOut))
                {
                    pipe.Connect(800);
                    byte[] message = Encoding.UTF8.GetBytes(Json.Serialize(Map("command", new object[] { "get_property", name })) + "\n");
                    pipe.Write(message, 0, message.Length);
                    pipe.Flush();
                    using (var reader = new StreamReader(pipe, Encoding.UTF8, false, 1024, true))
                    {
                        var pending = reader.ReadLineAsync();
                        if (!pending.Wait(1500) || String.IsNullOrWhiteSpace(pending.Result)) return null;
                        var response = Json.DeserializeObject(pending.Result) as Dictionary<string, object>;
                        object data;
                        if (response == null || !String.Equals(Value(response, "error"), "success", StringComparison.OrdinalIgnoreCase) ||
                            !response.TryGetValue("data", out data)) return null;
                        return data;
                    }
                }
            }
            catch { return null; }
        }

        private static void SendMpv(object[] command)
        {
            if (!TrySendMpv(command)) throw new UserError("当前没有正在播放的内容");
        }

        private static bool IsMpvReady()
        {
            return GetMpvProperty("pause") is bool;
        }

        private static object ManagedStateResult(Dictionary<string, object> state, string message)
        {
            object rawQueue;
            var queue = state.TryGetValue("queue", out rawQueue) ? rawQueue as ICollection : null;
            var view = Map("status", Value(state, "status", "stopped"), "currentIndex", Convert.ToInt32(Value(state, "currentIndex", "0")),
                "queueLength", queue == null ? 0 : queue.Count, "volume", Convert.ToInt32(Value(state, "volume", "50")),
                "title", Value(state, "title"), "meta", Value(state, "meta"),
                "position", state.ContainsKey("position") ? state["position"] : 0,
                "duration", state.ContainsKey("duration") ? state["duration"] : 0);
            var payload = Map("success", true, "message", message, "state", view);
            return Map("stdout", Json.Serialize(payload), "payload", payload, "exitCode", 0, "managedPlayer", true);
        }

        private static object RunNcm(string[] arguments, int timeoutMs)
        {
            NcmRuntime runtime = FindNcmRuntime();
            if (runtime == null) throw new UserError("未检测到官方 ncm-cli，请先点击设置完成安装");
            var all = new string[arguments.Length + 1];
            all[0] = runtime.ScriptPath;
            Array.Copy(arguments, 0, all, 1, arguments.Length);
            string mpv = FindExecutable("mpv.exe");
            ProcessResult result = Run(runtime.NodePath, all, timeoutMs, mpv == null ? null : Path.GetDirectoryName(mpv));
            string combined = (result.Stdout + "\n" + result.Stderr).Trim();
            if (result.TimedOut) throw new UserError("ncm-cli 操作超时，请检查网络或运行检测脚本");
            if (result.ExitCode != 0) throw new UserError(Compact(combined, 800));
            object payload = TryParseJson(result.Stdout);
            var payloadMap = payload as Dictionary<string, object>;
            object success;
            if (payloadMap != null && payloadMap.TryGetValue("success", out success) && success is bool && !(bool)success)
                throw new UserError(payloadMap.ContainsKey("message") ? SafeMessage(Convert.ToString(payloadMap["message"])) : "ncm-cli 操作失败");
            return Map("stdout", StripAnsi(result.Stdout), "payload", payload, "exitCode", result.ExitCode);
        }

        private static object LaunchNetease(Dictionary<string, object> payload)
        {
            string mode = GetString(payload, "mode", 20, true);
            string script = Path.GetFullPath(Path.Combine(BaseDirectory, "..", "tools", "Setup-NetEase.ps1"));
            if (!File.Exists(script)) throw new UserError("找不到网易云安装助手，请重新解压完整项目");
            string modeArg;
            switch (mode)
            {
                case "install": modeArg = "Install"; break;
                case "configure": modeArg = "Configure"; break;
                case "tui": modeArg = "Tui"; break;
                default: throw new UserError("无效的设置模式");
            }
            var info = new ProcessStartInfo("powershell.exe", "-NoExit -ExecutionPolicy Bypass -File " + QuoteArgument(script) + " -Mode " + modeArg)
            {
                UseShellExecute = true,
                WindowStyle = ProcessWindowStyle.Normal
            };
            Process.Start(info);
            return Map("launched", true);
        }

        private static object QqSearch(Dictionary<string, object> payload)
        {
            string keyword = ValidateKeyword(GetString(payload, "keyword", 100, true));
            string type = GetString(payload, "type", 20, true);
            string apiType = type == "song" ? "0" : type == "playlist" ? "2" : null;
            if (apiType == null) throw new UserError("不支持的搜索类型");
            return QqPost("/discover/search", Map("keyword", keyword, "type", apiType, "page", 0));
        }

        private static object QqPlaylistDetail(Dictionary<string, object> payload)
        {
            long playlistId = GetLong(payload, "playlistId", 1, Int64.MaxValue);
            int page = payload.ContainsKey("page") ? GetInt(payload, "page", 0, 10000) : 0;
            return QqPost("/playlists/detail", Map("dissId", playlistId, "page", page));
        }

        private static object QqPost(string path, Dictionary<string, object> parameters)
        {
            string key = ReadQqKey();
            using (var client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromSeconds(25);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", key);
                string body = Json.Serialize(Map("params", parameters, "comm", Map("skill_version", QqSkillVersion)));
                HttpResponseMessage response;
                try
                {
                    response = client.PostAsync(QqBaseUrl + path, new StringContent(body, Encoding.UTF8, "application/json")).GetAwaiter().GetResult();
                }
                catch (Exception error)
                {
                    throw new UserError("QQ 音乐连接失败：" + SafeMessage(error.GetBaseException().Message));
                }
                string content = response.Content.ReadAsStringAsync().GetAwaiter().GetResult();
                if (!response.IsSuccessStatusCode) throw new UserError("QQ 音乐官方接口返回 HTTP " + (int)response.StatusCode + "：" + Compact(content, 300));
                object parsed;
                try { parsed = Json.DeserializeObject(content); }
                catch { throw new UserError("QQ 音乐官方接口返回了无法识别的数据"); }
                var map = parsed as Dictionary<string, object>;
                if (map != null && map.ContainsKey("ret") && Convert.ToInt32(map["ret"]) != 0)
                    throw new UserError("QQ 音乐官方接口拒绝请求：" + (map.ContainsKey("msg") ? SafeMessage(Convert.ToString(map["msg"])) : "请检查 Key"));
                return parsed;
            }
        }

        private static object OpenOfficialUrl(string url)
        {
            Uri uri;
            if (!Uri.TryCreate(url, UriKind.Absolute, out uri) || uri.Scheme != "https" || (uri.Host != "y.qq.com" && uri.Host != "i2.y.qq.com"))
                throw new UserError("拒绝打开非官方地址");
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            return Map("opened", true);
        }

        private static NcmRuntime FindNcmRuntime()
        {
            string node = FindExecutable("node.exe");
            if (node == null) return null;
            var roots = new List<string>();
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            roots.Add(Path.Combine(appData, "npm", "node_modules"));
            string npm = FindExecutable("npm.cmd");
            if (npm != null)
            {
                var result = RunCommandShellConstant(npm, "root -g", 5000);
                if (result.ExitCode == 0 && !String.IsNullOrWhiteSpace(result.Stdout)) roots.Add(result.Stdout.Trim());
            }
            foreach (string root in roots)
            {
                string script = Path.Combine(root, "@music163", "ncm-cli", "dist", "index.js");
                if (File.Exists(script)) return new NcmRuntime { NodePath = node, ScriptPath = script };
            }
            return null;
        }

        private static string FindExecutable(string name)
        {
            string path = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (string segment in path.Split(Path.PathSeparator))
            {
                try
                {
                    string candidate = Path.Combine(segment.Trim(' ', '"'), name);
                    if (File.Exists(candidate)) return Path.GetFullPath(candidate);
                }
                catch { }
            }
            if (String.Equals(name, "mpv.exe", StringComparison.OrdinalIgnoreCase))
            {
                string[] knownMpvLocations = new[]
                {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "MPV Player", "mpv.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Microsoft", "WinGet", "Links", "mpv.exe")
                };
                foreach (string candidate in knownMpvLocations)
                {
                    try { if (File.Exists(candidate)) return Path.GetFullPath(candidate); }
                    catch { }
                }
            }
            return null;
        }

        private static ProcessResult Run(string executable, IEnumerable<string> arguments, int timeoutMs, string prependPath = null)
        {
            var argumentLine = new StringBuilder();
            foreach (string argument in arguments)
            {
                if (argumentLine.Length > 0) argumentLine.Append(' ');
                argumentLine.Append(QuoteArgument(argument));
            }
            var info = new ProcessStartInfo(executable, argumentLine.ToString())
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8
            };
            if (!String.IsNullOrWhiteSpace(prependPath))
            {
                string existingPath = info.EnvironmentVariables["PATH"] ?? "";
                info.EnvironmentVariables["PATH"] = prependPath + Path.PathSeparator + existingPath;
            }
            using (var process = Process.Start(info))
            {
                var stdout = new StringBuilder();
                var stderr = new StringBuilder();
                process.OutputDataReceived += delegate(object sender, DataReceivedEventArgs eventArgs)
                {
                    if (eventArgs.Data != null) lock (stdout) stdout.AppendLine(eventArgs.Data);
                };
                process.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs eventArgs)
                {
                    if (eventArgs.Data != null) lock (stderr) stderr.AppendLine(eventArgs.Data);
                };
                process.BeginOutputReadLine();
                process.BeginErrorReadLine();
                bool exited = process.WaitForExit(timeoutMs);
                if (!exited)
                {
                    try { process.Kill(); } catch { }
                    try { process.CancelOutputRead(); } catch { }
                    try { process.CancelErrorRead(); } catch { }
                    return new ProcessResult { ExitCode = -1, Stdout = stdout.ToString(), Stderr = stderr.ToString(), TimedOut = true };
                }
                Thread.Sleep(80);
                int exitCode = process.ExitCode;
                try { process.CancelOutputRead(); } catch { }
                try { process.CancelErrorRead(); } catch { }
                return new ProcessResult { ExitCode = exitCode, Stdout = stdout.ToString(), Stderr = stderr.ToString() };
            }
        }

        private static ProcessResult RunCommandShellConstant(string command, string arguments, int timeoutMs)
        {
            var info = new ProcessStartInfo("cmd.exe", "/d /c \"\"" + command + "\" " + arguments + "\"")
            {
                UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true
            };
            using (var process = Process.Start(info))
            {
                string stdout = process.StandardOutput.ReadToEnd();
                string stderr = process.StandardError.ReadToEnd();
                bool exited = process.WaitForExit(timeoutMs);
                if (!exited) { try { process.Kill(); } catch { } return new ProcessResult { ExitCode = -1, TimedOut = true, Stdout = stdout, Stderr = stderr }; }
                return new ProcessResult { ExitCode = process.ExitCode, Stdout = stdout, Stderr = stderr };
            }
        }

        private static string QuoteArgument(string argument)
        {
            if (argument == null) return "\"\"";
            if (!Regex.IsMatch(argument, "[\\s\\\"]")) return argument;
            var builder = new StringBuilder("\"");
            int slashes = 0;
            foreach (char c in argument)
            {
                if (c == '\\') { slashes++; continue; }
                if (c == '"') builder.Append('\\', slashes * 2 + 1).Append('"');
                else { builder.Append('\\', slashes).Append(c); }
                slashes = 0;
            }
            builder.Append('\\', slashes * 2).Append('"');
            return builder.ToString();
        }

        private static object TryParseJson(string text)
        {
            string clean = StripAnsi(text).Trim();
            try { return Json.DeserializeObject(clean); } catch { }
            int first = clean.IndexOf('{');
            int last = clean.LastIndexOf('}');
            if (first >= 0 && last > first)
            {
                try { return Json.DeserializeObject(clean.Substring(first, last - first + 1)); } catch { }
            }
            return null;
        }

        private static string ValidateKeyword(string value)
        {
            foreach (char c in value) if (Char.IsControl(c)) throw new UserError("搜索词不能包含控制字符");
            return value.Trim();
        }

        private static string RequireEncryptedId(Dictionary<string, object> payload, string name)
        {
            string value = GetString(payload, name, 32, true);
            if (!EncryptedId.IsMatch(value)) throw new UserError("资源 ID 格式无效");
            return value;
        }

        private static string RequireNumericId(Dictionary<string, object> payload, string name)
        {
            string value = GetString(payload, name, 20, true);
            if (!NumericId.IsMatch(value)) throw new UserError("歌曲原始 ID 格式无效");
            return value;
        }

        private static string GetString(Dictionary<string, object> map, string name, int max, bool required)
        {
            object raw;
            string value = map.TryGetValue(name, out raw) && raw != null ? Convert.ToString(raw).Trim() : "";
            if (required && String.IsNullOrWhiteSpace(value)) throw new UserError("缺少参数：" + name);
            if (value.Length > max) throw new UserError("参数过长：" + name);
            return value;
        }

        private static int GetInt(Dictionary<string, object> map, string name, int min, int max)
        {
            object raw;
            int value;
            if (!map.TryGetValue(name, out raw) || !Int32.TryParse(Convert.ToString(raw), out value) || value < min || value > max)
                throw new UserError("参数范围无效：" + name);
            return value;
        }

        private static long GetLong(Dictionary<string, object> map, string name, long min, long max)
        {
            object raw;
            long value;
            if (!map.TryGetValue(name, out raw) || !Int64.TryParse(Convert.ToString(raw), out value) || value < min || value > max)
                throw new UserError("参数范围无效：" + name);
            return value;
        }

        private static Dictionary<string, object> Map(params object[] values)
        {
            var result = new Dictionary<string, object>();
            for (int i = 0; i < values.Length; i += 2) result[(string)values[i]] = values[i + 1];
            return result;
        }

        private static Dictionary<string, object> Success(string id, object data) { return Map("id", id, "ok", true, "data", data); }
        private static Dictionary<string, object> Failure(string id, string error) { return Map("id", id, "ok", false, "error", String.IsNullOrWhiteSpace(error) ? "操作失败" : error); }

        private static byte[] ReadFrame(Stream input)
        {
            byte[] length = new byte[4];
            int first = input.ReadByte();
            if (first < 0) return null;
            length[0] = (byte)first;
            ReadExactly(input, length, 1, 3);
            int size = BitConverter.ToInt32(length, 0);
            if (size <= 0 || size > 8 * 1024 * 1024) throw new UserError("消息大小无效");
            byte[] body = new byte[size];
            ReadExactly(input, body, 0, size);
            return body;
        }

        private static void ReadExactly(Stream input, byte[] buffer, int offset, int count)
        {
            while (count > 0)
            {
                int read = input.Read(buffer, offset, count);
                if (read <= 0) throw new EndOfStreamException();
                offset += read;
                count -= read;
            }
        }

        private static void WriteFrame(Stream output, byte[] data)
        {
            byte[] length = BitConverter.GetBytes(data.Length);
            output.Write(length, 0, length.Length);
            output.Write(data, 0, data.Length);
            output.Flush();
        }

        private static string StripAnsi(string value) { return Regex.Replace(value ?? "", "\\x1B\\[[0-?]*[ -/]*[@-~]", ""); }
        private static string Compact(string value, int max)
        {
            string clean = Regex.Replace(StripAnsi(value ?? ""), "\\s+", " ").Trim();
            return clean.Length <= max ? clean : clean.Substring(0, max) + "…";
        }
        private static string SafeMessage(string value) { return Compact(value, 300).Replace("qmk-", "[KEY]-"); }

        private sealed class UserError : Exception { public UserError(string message) : base(message) { } }
        private sealed class NcmRuntime { public string NodePath; public string ScriptPath; }
        private sealed class ProcessResult { public int ExitCode; public string Stdout = ""; public string Stderr = ""; public bool TimedOut; }
    }
}
