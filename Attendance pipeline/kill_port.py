import os
import subprocess
import sys

def kill_port(port):
    print(f"[*] Searching for processes on port {port}...")
    try:
        # Get process ID using netstat
        cmd = f"netstat -ano | findstr :{port}"
        try:
            output = subprocess.check_output(cmd, shell=True).decode()
        except subprocess.CalledProcessError:
            print(f"[+] No processes found on port {port}.")
            return

        pids = set()
        for line in output.strip().split('\n'):
            parts = line.split()
            if len(parts) >= 5:
                # The PID is the last element
                pid = parts[-1]
                if pid.isdigit() and int(pid) > 0:
                    pids.add(pid)
        
        if not pids:
            print(f"[+] No valid PIDs found on port {port}.")
            return

        for pid in pids:
            print(f"[*] Killing process PID {pid}...")
            # Use taskkill /F /T to kill the process and its children
            os.system(f"taskkill /F /T /PID {pid} >nul 2>&1")
        
        print(f"[+] Successfully cleared port {port}.")
    except Exception as e:
        print(f"[-] Error: {e}")

if __name__ == "__main__":
    kill_port(8000)
