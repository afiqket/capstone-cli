import csv
import shutil
import subprocess
from datetime import datetime
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent

QNA_CSV = BASE_DIR / "qna.csv"
RUNS_DIR = BASE_DIR / "codex_runs"
RESULTS_DIR = BASE_DIR / "results"

CODEX_CMD = r"C:\Users\Lenovo\AppData\Roaming\npm\codex.cmd"

PROMPT_NAME = "prompt.txt"
ANSWER_NAME = "answer.txt"
RESULTS_PREFIX = "results"


def enabled(value: str) -> bool:
    return str(value).strip() == "1"


def run_dir_name(row_id: str) -> str:
    return f"run_{int(row_id):03d}"


def reset_run_dir(run_dir: Path) -> None:
    if run_dir.exists():
        shutil.rmtree(run_dir)
    run_dir.mkdir(parents=True, exist_ok=True)


def build_prompt(link: str, question: str) -> str:
    return f"""
Open this chart link using Playwright MCP:
{link}

Question:
{question}

Instructions:
- Use Playwright MCP browser tools to inspect the rendered chart.
- Use navigation, screenshot, snapshot, hover, click, or tooltip inspection as needed.
- Do not use web search.
- Answer only the question.
- If Playwright MCP is unavailable, answer exactly: PLAYWRIGHT_MCP_UNAVAILABLE
""".strip()


def write_prompt(run_dir: Path, prompt: str) -> None:
    (run_dir / PROMPT_NAME).write_text(
        prompt,
        encoding="utf-8",
        errors="replace",
    )


def run_codex(run_dir: Path) -> str:
    answer_path = run_dir / ANSWER_NAME

    cmd = [
        CODEX_CMD,
        "exec",

        "--cd",
        str(run_dir),

        "--skip-git-repo-check",
        "--ephemeral",
        "--dangerously-bypass-approvals-and-sandbox",

        "--output-last-message",
        str(answer_path),

        "-",
    ]

    short_prompt = (
        f"Read {PROMPT_NAME} and answer. "
        "Use Playwright MCP. "
        "If Playwright MCP is unavailable, answer exactly: PLAYWRIGHT_MCP_UNAVAILABLE"
    )

    result = subprocess.run(
        cmd,
        cwd=run_dir,
        input=short_prompt,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    (run_dir / "stdout.txt").write_text(result.stdout, encoding="utf-8", errors="replace")
    (run_dir / "stderr.txt").write_text(result.stderr, encoding="utf-8", errors="replace")

    if result.returncode != 0:
        raise RuntimeError(f"Codex failed. Check: {run_dir / 'stderr.txt'}")

    if answer_path.exists():
        return answer_path.read_text(encoding="utf-8", errors="replace").strip()

    return result.stdout.strip()


def read_qna() -> list[dict[str, str]]:
    with QNA_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)

        required = {"id", "link", "question", "enabled"}
        missing = required - set(reader.fieldnames or [])

        if missing:
            raise ValueError(f"Missing columns in qna.csv: {sorted(missing)}")

        return list(reader)


def make_results_path() -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return RESULTS_DIR / f"{RESULTS_PREFIX}_{timestamp}.csv"


def write_results(results: list[dict[str, str]]) -> Path:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    output_path = make_results_path()

    fieldnames = [
        "id",
        "link",
        "question",
        "run_dir",
        "status",
        "answer",
        "error",
    ]

    with output_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    return output_path


def run_one(row: dict[str, str]) -> dict[str, str]:
    row_id = row["id"].strip()
    link = row["link"].strip()
    question = row["question"].strip()

    run_dir = RUNS_DIR / run_dir_name(row_id)

    print(f"\n=== Running id={row_id} ===")
    print(f"Run dir: {run_dir}")
    print(f"Link: {link}")

    try:
        reset_run_dir(run_dir)

        prompt = build_prompt(link, question)
        write_prompt(run_dir, prompt)

        answer = run_codex(run_dir)

        print("Status: ok")
        print(f"Answer: {answer}")

        return {
            "id": row_id,
            "link": link,
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
            "link": link,
            "question": question,
            "run_dir": str(run_dir),
            "status": "error",
            "answer": "",
            "error": str(e),
        }


def main() -> None:
    rows = read_qna()
    rows = [row for row in rows if enabled(row.get("enabled", ""))]

    print(f"Enabled rows: {len(rows)}")

    results = [run_one(row) for row in rows]

    output_path = write_results(results)

    print(f"\nSaved results to: {output_path}")


if __name__ == "__main__":
    main()
