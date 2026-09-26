# Project Setup

## Standard Layout

```
myproject/
├── src/
│   └── mypackage/
│       ├── __init__.py
│       ├── main.py
│       ├── api/
│       ├── models/
│       └── utils/
├── tests/
│   ├── conftest.py
│   ├── test_api.py
│   └── test_models.py
├── pyproject.toml
├── README.md
└── .gitignore
```

`src/` layout prevents accidental imports of the uninstalled package. For
small/medium projects a flat `app/` package is fine (see architecture.md).

## pyproject.toml Template

```toml
[project]
name = "mypackage"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "pydantic>=2.0.0",
]

# Dev tooling as a PEP 735 dependency group: `uv add --dev` writes here and
# `uv sync` installs it by default. (An extra under
# [project.optional-dependencies] would need `uv sync --extra dev`.)
[dependency-groups]
dev = [
    "pytest>=8.0.0",
    "pytest-cov>=5.0.0",
    "pytest-asyncio>=0.23.0",
    "ruff>=0.4.0",
    "pyright>=1.1.350",
]

[tool.ruff]
line-length = 88

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "B"]
# I = import sorting (replaces isort), UP = pyupgrade, B = bugbear

[tool.pyright]
typeCheckingMode = "standard"

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "--cov=mypackage --cov-report=term-missing"
asyncio_mode = "auto"
```

If the project uses mypy instead of pyright:

```toml
[tool.mypy]
python_version = "3.11"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
```

## Toolchain

```bash
uv init && uv add pydantic            # uv preferred for new projects
uv add --dev pytest ruff pyright
uv run pytest

ruff check . --fix                    # lint + import sort (rule "I")
ruff format .                         # format (replaces black; no import sorting)
pyright .                             # type check

# Security / supply chain when relevant
bandit -r .
pip-audit
```

ruff replaces black (`ruff format`), isort (`ruff check` with the `I`
rules — `ruff format` alone does not sort imports), and most of pylint —
don't add those separately to new projects. Match the existing toolchain in established repos.

## Package Exports

```python
# mypackage/__init__.py
"""mypackage - package description."""

__version__ = "0.1.0"

from mypackage.models import User, Post
from mypackage.utils import format_name

__all__ = ["User", "Post", "format_name"]
```

## Import Conventions

Order: stdlib → third-party → local, blank line between groups (ruff's `I`
rules enforce this). Explicit imports only — never `from module import *`.
