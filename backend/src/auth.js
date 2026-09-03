import { db } from "./db.js";

export async function exigirAuth(req, res, next) {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "sem token" });

  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: "token inválido" });

  req.usuario = data.user;
  next();
}
