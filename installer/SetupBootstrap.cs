using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Text;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32;

namespace CloudMusicEdgeInstaller
{
    internal static class SetupBootstrap
    {
        private const string Version = "0.8.0";
        private const string ExtensionId = "obokfjbjcodhoohmlpokcmcdjlijjbmk";
        private const string HostName = "com.cloudmusic.edge.bridge";
        private const string HostFileName = "CloudMusicBridge-0.8.0.exe";
        private const string PayloadResource = "CloudMusicEdge.Payload.zip";
        private static readonly string InstallRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs", "CloudMusicEdge");
        private static readonly string UserDataRoot = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CloudMusicEdge");

        [STAThread]
        private static int Main(string[] args)
        {
            try
            {
                if (args.Length == 2 && args[0] == "--extract-test")
                {
                    ExtractPayload(Path.GetFullPath(args[1]));
                    return VerifyExtractedPayload(Path.GetFullPath(args[1])) ? 0 : 2;
                }
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(BuildForm());
                return 0;
            }
            catch (Exception error)
            {
                if (args.Length > 0) return 1;
                MessageBox.Show(error.Message, "CloudMusic Edge 安装失败", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }
        }

        private static Form BuildForm()
        {
            var form = new Form
            {
                Text = "CloudMusic Edge 个人安装器",
                Size = new Size(690, 505),
                MinimumSize = new Size(690, 505),
                StartPosition = FormStartPosition.CenterScreen,
                BackColor = Color.FromArgb(15, 17, 22),
                ForeColor = Color.White,
                Font = new Font("Microsoft YaHei UI", 9)
            };
            var title = new Label { Text = "CloudMusic Edge", Font = new Font("Microsoft YaHei UI", 22, FontStyle.Bold), Location = new Point(28, 22), AutoSize = true };
            var subtitle = new Label { Text = "v" + Version + " · 当前用户安装 · 不需要管理员权限", ForeColor = Color.FromArgb(151, 158, 172), Location = new Point(31, 67), AutoSize = true };
            var status = new TextBox
            {
                Location = new Point(30, 100), Size = new Size(615, 116), Multiline = true, ReadOnly = true,
                ScrollBars = ScrollBars.Vertical, BackColor = Color.FromArgb(25, 28, 35), ForeColor = Color.FromArgb(226, 230, 237), BorderStyle = BorderStyle.FixedSingle
            };
            form.Controls.Add(title); form.Controls.Add(subtitle); form.Controls.Add(status);

            Action refresh = delegate
            {
                string extension = Path.Combine(InstallRoot, "extension", "manifest.json");
                string host = Path.Combine(InstallRoot, "native-host", HostFileName);
                status.Text = (File.Exists(extension) && File.Exists(host)
                    ? "✓ 程序文件已安装\r\n"
                    : "! 尚未安装，先点击下方主按钮\r\n")
                    + "安装位置：" + InstallRoot + "\r\n"
                    + "特藏数据：" + Path.Combine(UserDataRoot, "plugin-collection.json") + "\r\n"
                    + "账号凭据不会由本安装器复制或备份。";
            };

            AddButton(form, "安装 / 修复并打开 Edge", 30, 244, 295, true, delegate
            {
                try
                {
                    InstallOrRepair();
                    string extensionPath = Path.Combine(InstallRoot, "extension");
                    Clipboard.SetText(extensionPath);
                    Process.Start(new ProcessStartInfo("msedge.exe", "edge://extensions") { UseShellExecute = true });
                    refresh();
                    MessageBox.Show("安装完成，扩展目录已复制。\n\n请在 Edge 扩展页开启开发人员模式，点击“加载解压缩的扩展”，然后粘贴并选择该目录。", "还差一次手动确认");
                }
                catch (Exception error) { MessageBox.Show(error.Message, "安装失败", MessageBoxButtons.OK, MessageBoxIcon.Error); }
            });
            AddButton(form, "复制扩展目录", 345, 244, 145, false, delegate
            {
                string path = Path.Combine(InstallRoot, "extension");
                if (!Directory.Exists(path)) { MessageBox.Show("请先安装。", "CloudMusic Edge"); return; }
                Clipboard.SetText(path); MessageBox.Show("扩展目录已复制：\n" + path, "CloudMusic Edge");
            });
            AddButton(form, "打开扩展页", 500, 244, 145, false, delegate { Process.Start(new ProcessStartInfo("msedge.exe", "edge://extensions") { UseShellExecute = true }); });
            AddButton(form, "安装 / 更新网易云依赖", 30, 307, 200, false, delegate { StartNeteaseHelper("Install"); });
            AddButton(form, "配置并扫码登录", 240, 307, 200, false, delegate { StartNeteaseHelper("Configure"); });
            AddButton(form, "打开安装目录", 450, 307, 195, false, delegate
            {
                if (!Directory.Exists(InstallRoot)) { MessageBox.Show("请先安装。", "CloudMusic Edge"); return; }
                Process.Start(new ProcessStartInfo("explorer.exe", InstallRoot) { UseShellExecute = true });
            });
            AddButton(form, "刷新状态", 30, 370, 200, false, delegate { refresh(); });
            AddButton(form, "打开使用说明", 240, 370, 200, false, delegate
            {
                string readme = Path.Combine(InstallRoot, "README.md");
                if (!File.Exists(readme)) { MessageBox.Show("请先安装。", "CloudMusic Edge"); return; }
                Process.Start(new ProcessStartInfo(readme) { UseShellExecute = true });
            });
            var notice = new Label
            {
                Text = "安全边界：不强装扩展、不修改浏览器策略；网易云与 QQ 必须在新电脑重新授权。个人迁移包最多只恢复插件特藏。",
                ForeColor = Color.FromArgb(151, 158, 172), Location = new Point(31, 430), Size = new Size(615, 35)
            };
            form.Controls.Add(notice);
            form.Shown += delegate { refresh(); };
            return form;
        }

        private static void AddButton(Form form, string text, int x, int y, int width, bool primary, EventHandler action)
        {
            var button = new Button
            {
                Text = text, Location = new Point(x, y), Size = new Size(width, 45), FlatStyle = FlatStyle.Flat,
                BackColor = primary ? Color.FromArgb(236, 65, 65) : Color.FromArgb(31, 35, 43), ForeColor = Color.White, Cursor = Cursors.Hand
            };
            button.FlatAppearance.BorderSize = 1;
            button.FlatAppearance.BorderColor = Color.FromArgb(60, 66, 78);
            button.Click += action;
            form.Controls.Add(button);
        }

        private static void InstallOrRepair()
        {
            bool carriesCollection = PayloadContains("migration/plugin-collection.json");
            ExtractPayload(InstallRoot);
            if (!VerifyExtractedPayload(InstallRoot)) throw new InvalidDataException("安装包内容不完整");
            Directory.CreateDirectory(UserDataRoot);
            string migration = Path.Combine(InstallRoot, "migration", "plugin-collection.json");
            if (!carriesCollection && File.Exists(migration)) File.Delete(migration);
            string collection = Path.Combine(UserDataRoot, "plugin-collection.json");
            if (File.Exists(migration) && !File.Exists(collection)) File.Copy(migration, collection, false);

            string hostPath = Path.Combine(InstallRoot, "native-host", HostFileName);
            string manifestPath = Path.Combine(InstallRoot, "native-host", HostName + ".json");
            var manifest = new System.Collections.Generic.Dictionary<string, object>
            {
                { "name", HostName }, { "description", "CloudMusic Edge secure native bridge" },
                { "path", hostPath }, { "type", "stdio" },
                { "allowed_origins", new[] { "chrome-extension://" + ExtensionId + "/" } }
            };
            File.WriteAllText(manifestPath, new JavaScriptSerializer().Serialize(manifest), new UTF8Encoding(false));
            using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Edge\NativeMessagingHosts\" + HostName))
            {
                if (key == null) throw new InvalidOperationException("无法创建当前用户 Native Messaging 注册项");
                key.SetValue(null, manifestPath, RegistryValueKind.String);
            }
        }

        private static void StartNeteaseHelper(string mode)
        {
            string script = Path.Combine(InstallRoot, "tools", "Setup-NetEase.ps1");
            if (!File.Exists(script)) { MessageBox.Show("请先完成安装。", "CloudMusic Edge"); return; }
            string arguments = "-NoProfile -ExecutionPolicy Bypass -File \"" + script.Replace("\"", "\\\"") + "\" -Mode " + mode;
            Process.Start(new ProcessStartInfo("powershell.exe", arguments) { UseShellExecute = true, WindowStyle = ProcessWindowStyle.Normal });
        }

        private static void ExtractPayload(string destinationRoot)
        {
            Directory.CreateDirectory(destinationRoot);
            string safeRoot = Path.GetFullPath(destinationRoot).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            using (Stream resource = Assembly.GetExecutingAssembly().GetManifestResourceStream(PayloadResource))
            {
                if (resource == null) throw new InvalidDataException("安装包缺少内嵌载荷");
                using (var archive = new ZipArchive(resource, ZipArchiveMode.Read, false))
                {
                    foreach (ZipArchiveEntry entry in archive.Entries)
                    {
                        string target = Path.GetFullPath(Path.Combine(destinationRoot, entry.FullName.Replace('/', Path.DirectorySeparatorChar)));
                        if (!target.StartsWith(safeRoot, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("安装包包含越界路径");
                        if (String.IsNullOrEmpty(entry.Name)) { Directory.CreateDirectory(target); continue; }
                        Directory.CreateDirectory(Path.GetDirectoryName(target));
                        using (Stream input = entry.Open())
                        using (var output = new FileStream(target, FileMode.Create, FileAccess.Write, FileShare.None)) input.CopyTo(output);
                    }
                }
            }
        }

        private static bool PayloadContains(string path)
        {
            using (Stream resource = Assembly.GetExecutingAssembly().GetManifestResourceStream(PayloadResource))
            {
                if (resource == null) return false;
                using (var archive = new ZipArchive(resource, ZipArchiveMode.Read, false))
                {
                    foreach (ZipArchiveEntry entry in archive.Entries)
                        if (String.Equals(entry.FullName.Replace('\\', '/'), path, StringComparison.OrdinalIgnoreCase)) return true;
                }
            }
            return false;
        }

        private static bool VerifyExtractedPayload(string root)
        {
            return File.Exists(Path.Combine(root, "extension", "manifest.json"))
                && File.Exists(Path.Combine(root, "native-host", HostFileName))
                && File.Exists(Path.Combine(root, "tools", "Setup-NetEase.ps1"));
        }
    }
}
