import 'dotenv/config';
import { createApp } from './app';

async function startServer() {
  try {
    const app = await createApp();
    const PORT = 3000;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
