# Supermarket Operations Console

A multi-role operations console for managing supermarkets, delivery flows, suppliers, and customers from one place. The project ships with a Spring Boot 3 backend that talks to an Oracle database via stored procedures and a lightweight HTML/JS console UI with push notifications, chat, dashboards, and payment handling.

## Highlights
- Authentication with JWT, per-role permissions, admin role management, and self-service role requests.
- Catalog and operations management: supermarkets, warehouses, goods, categories, suppliers, and stock levels driven by PL/SQL packages.
- Orders and checkout: customer/internal orders, supplier orders, status updates, and payments (cash, card, wallet) with refunds and account top-ups.
- Communications: chat over REST + WebSocket, Web Push notifications, and a service worker to surface alerts even when the tab is inactive.
- Reporting and dashboards: KPI snapshot across orders, inventory, payments, users, and recent activity logs.
- Archive and audit: hierarchical archive with upload/download, inline preview/edit for text, docx/xlsx parsing, and database metadata/browser.

## Architecture
- **Backend:** Spring Boot 3, stateless security with `spring-security` + JJWT, WebSocket STOMP endpoints (`/ws`), Web Push (BouncyCastle + `web-push`), Oracle access through `JdbcTemplate` calling stored packages such as `pkg_sklad`, `pkg_zbozi`, `pkg_objednavka`, `pkg_role`, and others. Apache POI powers document previews.
- **Frontend:** Static console in `src/main/resources/static` (`landing.html`, `login.html`, `register.html`, `index.html`) styled with `css/console.css` and orchestrated by `js/console-app.js` and its modules. A service worker (`sw.js`) handles push notifications and quick actions.
- **Diagrams:** Database visuals live in `DBview/ERD.png` and `DBview/LMD.png` for reference.

## Project Layout
- `src/main/java/dreamteam/com/supermarket/config` - CORS, security, WebSocket config.
- `src/main/java/dreamteam/com/supermarket/controller` - REST endpoints (auth, dashboard, market CRUD, orders, payments, chat, archive, wallet, permissions, role requests, etc.).
- `src/main/java/dreamteam/com/supermarket/Service` - Business logic around orders, checkout, dashboards, permissions, notifications, and database glue.
- `src/main/java/dreamteam/com/supermarket/repository` - DAO wrappers over Oracle stored procedures and functions.
- `src/main/resources/application.properties` - Default configuration (Oracle connection, JWT secret, Web Push keys, server port).
- `src/main/resources/static` - Console UI assets, fragments, service worker, and marketing landing page.
- `DBview` - Database diagrams.

## Prerequisites
- JDK 17+
- Maven 3.9+
- Access to an Oracle database with the expected schema and PL/SQL packages (`pkg_*`) that mirror the DAO calls in `repository`.

## Configuration
Copy `src/main/resources/application.properties` to `application-local.properties` (or use environment variables) and set:
- `spring.datasource.url`, `spring.datasource.username`, `spring.datasource.password`, `spring.datasource.driver-class-name`
- `server.port` (defaults to `8082`)
- `jwt.secret`
- `webpush.public-key`, `webpush.private-key`, `webpush.subject`

Keep real secrets out of version control. The app uses stateless JWT auth; the UI stores the bearer token in `localStorage` and sends it as `Authorization: Bearer <token>`.

## Running Locally
```bash
mvn clean package
mvn spring-boot:run
```
Then open `http://localhost:8082/landing.html` (marketing), `http://localhost:8082/login.html` or `register.html`, and `http://localhost:8082/index.html` for the console (requires a valid JWT).

## API Quick Tour
- `POST /auth/register`, `POST /auth/login` - create users and obtain JWTs.
- `/api/dashboard` - KPI snapshot for the signed-in user.
- `/api/market/**` - supermarkets, warehouses, categories, goods CRUD via stored procedures.
- `/api/orders`, `/api/customer/checkout`, `/api/client-orders`, `/api/supplier-orders` - create/update/list orders for customers, staff, and suppliers.
- `/api/wallet/**` - wallet balance, top-ups, refunds, and report generation.
- `/api/payment/**` - payment metadata for orders.
- `/api/chat/**` - inbox summary, contacts, conversations, message edit/delete.
- `/api/push/**` - subscribe/unsubscribe Web Push.
- `/api/archive/**` - archive tree, upload/download, text/docx/xlsx preview, inline edits.
- `/api/admin/**` - permissions and role-to-permission mapping.
- `/api/profile/**`, `/api/dbmeta/**` - profile updates and database metadata browser.

Many operations depend on Oracle stored packages; without them the endpoints will not function.

## Development Tips
- WebSocket STOMP endpoint: `/ws` with application destinations under `/app` and broker topics under `/topic`.
- Service worker: `/sw.js` must be served over the app origin; push notifications rely on the Web Push keys above.
- Default static resources are cached aggressively by browsers; force-refresh during UI tweaks.

## Testing and Build
- Run the suite: `mvn test` (no extensive tests are present yet).
- Build an executable jar: `mvn clean package` produces `target/supermarket-0.0.1-SNAPSHOT.jar`.
