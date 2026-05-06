# run.py
import shutil
import subprocess
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent

SOURCE_JS_PATH = BASE_DIR / "f792e00c5ceb4b87@14.js"
SOURCE_CSV_PATH = BASE_DIR / "899584d54db2b20a3c2bbae35b5a9636cb3303fb65fef5daa2a9ee27c361ae00397d8206a8c9beae7926ac5ad7d8f072ed12e2b53bdddd331fa13c502b0969f3.csv"

QUESTION = "Which occupation has an unexpectedly high immigrant percentage compared to its wage category?"

CODEX_CMD = r"C:\Users\Lenovo\AppData\Roaming\npm\codex.cmd"

RUN_DIR = BASE_DIR / "codex_runs" / "run_004"
OUTPUT_DIR = RUN_DIR / "outputs"

JS_NAME = "chart.js"
CSV_NAME = "data.csv"
PROMPT_NAME = "prompt.txt"
ANSWER_NAME = "answer.txt"


def reset_run_directory() -> None:
    if RUN_DIR.exists():
        shutil.rmtree(RUN_DIR)

    RUN_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def copy_input_files() -> None:
    if not SOURCE_JS_PATH.exists():
        raise FileNotFoundError(f"JS file not found: {SOURCE_JS_PATH}")

    if not SOURCE_CSV_PATH.exists():
        raise FileNotFoundError(f"CSV file not found: {SOURCE_CSV_PATH}")

    shutil.copy2(SOURCE_JS_PATH, RUN_DIR / JS_NAME)
    shutil.copy2(SOURCE_CSV_PATH, RUN_DIR / CSV_NAME)


def build_prompt(question: str) -> str:
    return f"""
Read the files in this directory:
- {JS_NAME}
- {CSV_NAME}

Answer the question:
{question}
""".strip()


def write_prompt_file(prompt: str) -> Path:
    prompt_path = RUN_DIR / PROMPT_NAME
    prompt_path.write_text(prompt, encoding="utf-8", errors="replace")
    return prompt_path


def run_codex(prompt_path: Path) -> str:
    answer_path = OUTPUT_DIR / ANSWER_NAME

    short_prompt = f"""
Read {PROMPT_NAME}
""".strip()

    cmd = [
        CODEX_CMD,
        "exec",
        "--cd",
        str(RUN_DIR),
        "--ephemeral",
        "--skip-git-repo-check",
        "--output-last-message",
        str(answer_path),
        short_prompt,
    ]

    result = subprocess.run(
        cmd,
        cwd=RUN_DIR,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    print("=== Run directory ===")
    print(RUN_DIR)

    print("\n=== Files in run directory ===")
    for path in sorted(RUN_DIR.rglob("*")):
        print(path.relative_to(RUN_DIR))

    print("\n=== Short prompt sent to Codex ===")
    print(short_prompt)

    print("\n=== Codex stdout ===")
    print(result.stdout)

    if result.stderr.strip():
        print("\n=== Codex stderr ===")
        print(result.stderr)

    if result.returncode != 0:
        raise RuntimeError(f"Codex failed with exit code {result.returncode}")

    if answer_path.exists():
        return answer_path.read_text(encoding="utf-8", errors="replace")

    return result.stdout


def main():
    reset_run_directory()
    copy_input_files()

    prompt = build_prompt(QUESTION)
    prompt_path = write_prompt_file(prompt)

    answer = run_codex(prompt_path)

    print("\n=== Final saved answer ===")
    print(answer)


if __name__ == "__main__":
    main()