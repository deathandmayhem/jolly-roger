export default (req, res, next) => {
  const auth = req.get('Authorization');
  if (!auth) {
    res.sendStatus(401);
    return;
  }

  const [authScheme, ...authParamParts] = auth.split(' ');
  const authParam = authParamParts.join(' ');

  if (authScheme.toLowerCase() !== 'bearer') {
    res.sendStatus(403);
    return;
  }

  const key = Models.APIKeys.findOne({ key: authParam });
  if (!key) {
    res.sendStatus(403);
    return;
  }

  next();
};
