# __APP_TITLE__

Personal (non-KTH) web app on the personal design system. Profile: `__PROFILE__`.

- Use the `design-system` MCP before building UI: `get_app_profile("__PROFILE__")`, `get_pattern`, `get_component_spec` for every component.
- Only `@sabahat/react-ui-kit` components; tokens (`var(--ui-*)`) and Bootstrap utilities only; no other UI libraries, no Bootstrap JS.
- Spec-driven: `specs/product.md` + `specs/features/*.md` with numbered acceptance criteria; `tasks.md` tracks work; tests are named after ACs.
- Run `check_ui_code` on changed UI files before finishing.
__HOME_NOTE__
