function exigirAutenticacao(req, res, next) {
  if (req.session && req.session.usuario) return next();
  return res.redirect("/login");
}

export { exigirAutenticacao };
