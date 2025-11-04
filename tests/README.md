Integration tests

Files:
- `run_tests.ps1` - PowerShell script that runs an end-to-end scenario: signup, read dev mailbox, verify, login, create a task, list tasks, logout. Uses a single WebSession to preserve cookies.
- `run_tests.sh` - Bash alternative that uses curl + jq (requires curl and jq installed).

How to run (PowerShell - recommended on Windows):

```powershell
# from repository root
powershell -ExecutionPolicy Bypass -File tests/integration/run_tests.ps1
```

How to run (bash - Linux/macOS or WSL):

```bash
# make executable
chmod +x tests/integration/run_tests.sh
./tests/integration/run_tests.sh
```

Notes:
- Tests hit services at `http://localhost:3000` (server) and expect the dev mailbox at `/dev/mailbox` to contain the verification code.
- If containers are not running, start them with:

```powershell
# Windows PowerShell
docker compose up --build -d
```

If you want, I can run the PowerShell test now and report the results. If you prefer, grant me command-line access and I'll run the bash version too.
