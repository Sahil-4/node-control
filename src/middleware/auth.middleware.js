function unauthorized(res) {
  res.set("WWW-Authenticate", 'Basic realm="NodeControl"');
  return res.status(401).json({ error: "Unauthorized" });
}

function parseBasicAuth(header) {
  if (!header || !header.startsWith("Basic ")) {
    return null;
  }

  const encoded = header.slice(6).trim();
  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");

  if (separatorIndex === -1) {
    return null;
  }

  return {
    user: decoded.slice(0, separatorIndex),
    pass: decoded.slice(separatorIndex + 1),
  };
}

function authMiddleware(req, res, next) {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPass = process.env.ADMIN_PASS;

  if (!expectedUser || !expectedPass) {
    return res
      .status(500)
      .json({ error: "Server authentication is not configured" });
  }

  const credentials = parseBasicAuth(req.headers.authorization);
  if (!credentials) {
    return unauthorized(res);
  }

  if (credentials.user !== expectedUser || credentials.pass !== expectedPass) {
    return unauthorized(res);
  }

  req.auth = { user: credentials.user };
  return next();
}

module.exports = authMiddleware;
