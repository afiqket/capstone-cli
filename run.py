# run.py
import csv
import shutil
import subprocess
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent

QNA_CSV = BASE_DIR / "qna.csv"
CHARTS_DIR = BASE_DIR / "charts"
RUNS_DIR = BASE_DIR / "codex_runs"

CODEX_CMD = r"C:\Users\Lenovo\AppData\Roaming\npm\codex.cmd"

PROMPT_NAME = "prompt.txt"
ANSWER_NAME = "answer.txt"
RESULTS_NAME = "results.csv"


def is_enabled(value: str) -> bool:
    return str(value).strip() == "1"


def run_dir_name(row_id: str) -> str:
    return f"run_{int(row_id):03d}"


def reset_run_directory(run_dir: Path) -> None:
    if run_dir.exists():
        shutil.rmtree(run_dir)
    run_dir.mkdir(parents=True, exist_ok=True)


def find_chart_files(source_dir: Path) -> list[Path]:
    files: list[Path] = []

    for pattern in ("*.js", "*.csv"):
        files.extend(source_dir.rglob(pattern))

    return sorted(path for path in files if path.is_file())


def copy_chart_files(source_dir: Path, run_dir: Path) -> list[str]:
    if not source_dir.exists():
        raise FileNotFoundError(f"Source folder not found: {source_dir}")

    chart_files = find_chart_files(source_dir)

    if not chart_files:
        raise FileNotFoundError(f"No JS or CSV files found in: {source_dir}")

    copied_relative_paths: list[str] = []

    for source_path in chart_files:
        relative_path = source_path.relative_to(source_dir)
        destination_path = run_dir / relative_path

        destination_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, destination_path)

        copied_relative_paths.append(relative_path.as_posix())

    return copied_relative_paths


def build_prompt(question: str, copied_files: list[str]) -> str:
    file_list = "\n".join(f"- {name}" for name in copied_files)

    return f"""Read these files:
{file_list}

Question:
{question}

Answer only the question.""".strip()


def write_prompt_file(run_dir: Path, prompt: str) -> Path:
    prompt_path = run_dir / PROMPT_NAME
    prompt_path.write_text(prompt, encoding="utf-8", errors="replace")
    return prompt_path


def run_codex(run_dir: Path) -> str:
    answer_path = run_dir / ANSWER_NAME

    # Keep the command-line prompt minimal.
    # The actual question is inside prompt.txt, not printed into stdin.
    short_prompt = f"Read {PROMPT_NAME} and answer."

    cmd = [
        CODEX_CMD,
        "exec",
        "--cd",
        str(run_dir),
        "--ephemeral",
        "--skip-git-repo-check",
        "--output-last-message",
        str(answer_path),
        short_prompt,
    ]

    result = subprocess.run(
        cmd,
        cwd=run_dir,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    (run_dir / "stdout.txt").write_text(result.stdout, encoding="utf-8", errors="replace")
    (run_dir / "stderr.txt").write_text(result.stderr, encoding="utf-8", errors="replace")

    if result.returncode != 0:
        raise RuntimeError(f"Codex failed with exit code {result.returncode}. See {run_dir / 'stderr.txt'}")

    if answer_path.exists():
        return answer_path.read_text(encoding="utf-8", errors="replace").strip()

    return result.stdout.strip()


def read_qna_rows() -> list[dict[str, str]]:
    if not QNA_CSV.exists():
        raise FileNotFoundError(f"QNA CSV not found: {QNA_CSV}")

    with QNA_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        required_columns = {"id", "title", "question", "enabled"}
        missing_columns = required_columns - set(reader.fieldnames or [])

        if missing_columns:
            raise ValueError(f"Missing columns in qna.csv: {sorted(missing_columns)}")

        return list(reader)


def write_results(rows: list[dict[str, str]]) -> None:
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    results_path = RUNS_DIR / RESULTS_NAME

    fieldnames = [
        "id",
        "title",
        "question",
        "run_dir",
        "status",
        "answer",
        "error",
    ]

    with results_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def run_one(row: dict[str, str]) -> dict[str, str]:
    row_id = row["id"].strip()
    title = row["title"].strip()
    question = row["question"].strip()

    run_dir = RUNS_DIR / run_dir_name(row_id)
    source_dir = CHARTS_DIR / title

    print(f"\n=== Running id={row_id} title={title} ===")
    print(f"Source: {source_dir}")
    print(f"Run dir: {run_dir}")

    try:
        reset_run_directory(run_dir)
        copied_files = copy_chart_files(source_dir, run_dir)

        prompt = build_prompt(question, copied_files)
        write_prompt_file(run_dir, prompt)

        answer = run_codex(run_dir)

        print("Status: ok")
        print(f"Answer: {answer}")

        return {
            "id": row_id,
            "title": title,
            "question": question,
            "run_dir": str(run_dir),
            "status": "ok",
            "answer": answer,
            "error": "",
        }

    except Exception as e:
        print("Status: error")
        print(f"Error: {e}")

        return {
            "id": row_id,
            "title": title,
            "question": question,
            "run_dir": str(run_dir),
            "status": "error",
            "answer": "",
            "error": str(e),
        }


def main() -> None:
    rows = read_qna_rows()
    enabled_rows = [row for row in rows if is_enabled(row.get("enabled", ""))]

    print(f"Loaded {len(rows)} rows from {QNA_CSV}")
    print(f"Enabled rows: {len(enabled_rows)}")

    results = [run_one(row) for row in enabled_rows]
    write_results(results)

    print(f"\nSaved results to: {RUNS_DIR / RESULTS_NAME}")


if __name__ == "__main__":
    main()
