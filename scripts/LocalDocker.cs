// Windows adapter for the pinned Supabase CLI; only its child processes use it.
// Docker Desktop ignores default bind addresses: make publication IPs explicit.
using System;
using System.Diagnostics;
using System.Linq;
using System.Text;

class LocalDocker {
    static string Quote(string value) {
        var result = new StringBuilder("\"");
        int slashes = 0;
        foreach (char c in value) {
            if (c == '\\') { slashes++; continue; }
            result.Append('\\', c == '"' ? slashes * 2 + 1 : slashes);
            result.Append(c);
            slashes = 0;
        }
        return result.Append('\\', slashes * 2).Append('"').ToString();
    }
    static int Main(string[] args) {
        string real = Environment.GetEnvironmentVariable("CLASSROOM_REAL_DOCKER");
        if (String.IsNullOrEmpty(real)) return 1;
        bool publishes = args.Length > 0 && (args[0] == "run" || args[0] == "create" ||
            (args.Length > 1 && args[0] == "container" && (args[1] == "run" || args[1] == "create")));
        for (int i = 0; publishes && i < args.Length; i++) {
            if (args[i] == "-p" || args[i] == "--publish") {
                if (++i == args.Length) return 1;
                args[i] = Bind(args[i]);
            } else if (args[i].StartsWith("--publish=")) {
                args[i] = "--publish=" + Bind(args[i].Substring(10));
            }
        }
        var start = new ProcessStartInfo(real, String.Join(" ", args.Select(Quote))) {
            UseShellExecute = false, CreateNoWindow = true,
            RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true
        };
        using (var process = Process.Start(start)) {
            var output = process.StandardOutput.BaseStream.CopyToAsync(Console.OpenStandardOutput());
            var errors = process.StandardError.BaseStream.CopyToAsync(Console.OpenStandardError());
            Console.OpenStandardInput().CopyToAsync(process.StandardInput.BaseStream).ContinueWith(
                ignored => { try { process.StandardInput.Close(); } catch {} });
            process.WaitForExit();
            System.Threading.Tasks.Task.WaitAll(output, errors);
            return process.ExitCode;
        }
    }
    static string Bind(string value) {
        if (value.StartsWith("127.0.0.1:")) return value;
        if (value.Split(':').Length <= 2) return "127.0.0.1:" + value;
        throw new Exception("Refusing non-loopback Docker publication");
    }
}
