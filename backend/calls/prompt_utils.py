from string import Template
import pathlib, asyncio

PROMPT_DIR = pathlib.Path("backend/prompts")

async def render_prompt(name: str, context: dict):
    path = PROMPT_DIR / f"{name}.txt"
    try:
        tmpl = Template(path.read_text())
        return tmpl.safe_substitute(context)
    except FileNotFoundError:
        # Fallback to default if prompt file doesn't exist
        default_path = PROMPT_DIR / "default.txt"
        tmpl = Template(default_path.read_text())
        return tmpl.safe_substitute(context)