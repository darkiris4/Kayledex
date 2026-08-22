from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

TEMPLATES_DIR = Path(__file__).parent / "templates"
_env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))


def render_pdf(template_name: str, context: dict) -> bytes:
    template = _env.get_template(template_name)
    html = template.render(**context)
    return HTML(string=html).write_pdf()
