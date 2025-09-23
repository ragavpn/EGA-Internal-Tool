
  # Internal Tool for Device Management

  This is a code bundle for Internal Tool for Device Management. The original project is available at https://www.figma.com/design/78fzmJPe6YSG6LYX2zs6Yi/Internal-Tool-for-Device-Management.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Supabase setup and bootstrapping

  This project includes helper scripts that use the Supabase CLI to create the KV table and deploy the edge function used by the app. Before running them, set the following environment variables (or add them to a `.env` file when running locally):

  - SUPABASE_URL - your Supabase project URL (e.g. https://xyz.supabase.co)
  - SUPABASE_SERVICE_ROLE_KEY - your Supabase service role key (keep secret)
  - VITE_SUPABASE_PROJECT_ID - the public project id (used by the frontend)
  - VITE_SUPABASE_ANON_KEY - the public anon key (used by the frontend)
  - KV_TABLE_NAME - (optional) the table name to create for KV storage (defaults to `kv_store_354d5d14`)
  - EDGE_FN_NAME - (optional) the edge function name to deploy (defaults to `make-server-354d5d14`)

  To initialize the database and deploy the edge function in order, run:

  ```bash
  # Install dependencies (only needed once)
  npm install

  # Bootstrap creates a migration for the KV table and deploys the edge function
  npm run bootstrap
  ```

  ### Troubleshooting Permission Issues

  If you encounter permission errors during bootstrap, run these commands to fix file permissions:

  ```bash
  # Make scripts executable
  chmod -R +x scripts/

  # Fix file ownership (replace $USER with your username if needed)
  chown -R $USER:$USER .
  ```

  The bootstrap script attempts to fix these permissions automatically on Unix-like systems (Linux/macOS).

  Notes:
  - The scripts call the Supabase CLI via `npx supabase ...`. You can also install the Supabase CLI globally.
  - The scripts will create a migration SQL file in `supabase/migrations/` and then apply it to your database using the CLI.
  - The edge function source is copied from `src/supabase/functions/server` into `supabase/functions/<EDGE_FN_NAME>` before deployment. Verify the generated function code if you customized server internals.
  - The base path for API routes is automatically set to `/${EDGE_FN_NAME}` based on your environment configuration.
  - If the edge function already exists, the deployment script will skip creation and proceed with updating the existing function.
  