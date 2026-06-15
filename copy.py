from pathlib import Path

# Project root
root = Path(r"D:\home\ai-chess-arena")

# Folders to scan
folders = [
    "src/agents",
    "src/chess_engine",
    "src/config",
    "src/graphs",
    "src/models",
    "src/state",
]

# Output file
output_file = root / "all_python_code.txt"

with open(output_file, "w", encoding="utf-8") as outfile:

    for folder in folders:
        folder_path = root / folder

        if not folder_path.exists():
            print(f"Folder not found: {folder_path}")
            continue

        for py_file in sorted(folder_path.rglob("*.py")):

            try:
                content = py_file.read_text(
                    encoding="utf-8",
                    errors="ignore"
                )

                # Skip empty files
                if not content.strip():
                    continue

                outfile.write("\n")
                outfile.write("=" * 100 + "\n")
                outfile.write(f"FILE: {py_file.relative_to(root)}\n")
                outfile.write("=" * 100 + "\n\n")
                outfile.write(content)
                outfile.write("\n\n")

            except Exception as e:
                print(f"Error reading {py_file}: {e}")

print(f"Done! Output saved to:\n{output_file}")