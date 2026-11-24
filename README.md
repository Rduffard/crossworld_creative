# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

### Operations artwork

The Headquarters windows and Office floor plan are original CSS illustrations in `src/Pages/Operations/Operations.css`. `VirtualOffice.jsx` assembles rooms from the workforce and host APIs. `CrewPortrait.jsx` renders a reusable 38 px identity marker, with a 27 px variant on the floor plan. The initials come from the persisted employee name, the fill reflects the role, and the border reflects observed activity. The adjacent text communicates the same status.

Use the `operations__studio-*` and `operations__crew-*` namespaces for related components. Room layouts adapt to the viewport and use CSS shapes and reusable colors as their source format, so this set needs no image export, external fonts, or binary asset storage. Keep any future bitmap variants sized to their display slot and device pixel ratio, record author and license at import, and use the established media storage when repository size would otherwise grow. The current illustrations use original project code and no third-party artwork. Screenshots used in review are verification artifacts.
