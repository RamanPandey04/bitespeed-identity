import { app } from "./app";
import { initDB } from "./db";

const PORT = process.env.PORT || 3000;

initDB()
  .then(() => {
    app.listen(PORT, () => console.log(`listening on ${PORT}`));
  })
  .catch(err => {
    console.error("failed to start:", err);
    process.exit(1);
  });