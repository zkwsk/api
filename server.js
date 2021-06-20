const { build } = require("./app.js");

const app = build({ logger: true });

app.listen(5000, (err, address) => {
  if (err) {
    console.log(err);
    process.exit(1);
  }
});
