const mongoose = require("mongoose");

const contactsSnapshotSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChildDevice",
      required: true,
      index: true,
    },
    contacts: [
      {
        displayName: String,
        phoneNumber: String,
      },
    ],
    capturedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactsSnapshot", contactsSnapshotSchema);
