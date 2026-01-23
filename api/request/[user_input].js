export default function handler(req, res) {
  const userInputParam = req.query.user_input;
  const userInput = Array.isArray(userInputParam)
    ? userInputParam.join(" ")
    : (userInputParam || "").trim();

  let message;

  switch (userInput.toLowerCase()) {
    case "status":
      message = "System is online";
      break;
    default:
      message = `Received your request for: ${userInput || "(empty)"}`;
      break;
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.status(200).send(message);
}