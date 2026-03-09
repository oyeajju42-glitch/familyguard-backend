const mapDocument = (doc) => {
  if (!doc) return null;
  const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  plain.id = plain._id?.toString();
  delete plain._id;
  delete plain.__v;
  return plain;
};

module.exports = { mapDocument };
