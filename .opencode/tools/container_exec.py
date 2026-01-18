import docker
import sys

def execute_in_container(container_name: str, command: str):
    """
    Executes a command inside a specific container and returns the output.
    """
    client = docker.from_env()
    try:
        container = client.containers.get(container_name)
        exit_code, output = container.exec_run(command)
        return {
            "exit_code": exit_code,
            "output": output.decode('utf-8')
        }
    except Exception as e:
        return {
            "exit_code": 1,
            "output": str(e)
        }

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: container_exec.py <container_name> <command>")
        sys.exit(1)
    
    res = execute_in_container(sys.argv[1], sys.argv[2])
    print(res["output"])
    sys.exit(res["exit_code"])