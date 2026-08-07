import mongoose from "mongoose"

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    default: null,
  },
  authProviders: [
    {
      provider: {
        type: String,
        enum: ["google", "microsoft", 'local'],
        default: 'local',
      },
      providerId: {
        type: String,
        default: null,
      },
    },
  ],
})

export default mongoose.model("User", UserSchema);