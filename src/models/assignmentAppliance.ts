import mongoose, { Schema } from 'mongoose';

const AssignmentApplianceSchema = new Schema(
  {
    assignmentId: { type: String, required: true, unique: true, index: true },
    applianceBrandname: { type: String, default: null },
    applianceModel: { type: String, default: null },
    applianceSerial: { type: String, default: null },
    applianceIssue: { type: String, default: null },
  },
  { timestamps: true }
);

if (mongoose.models.AssignmentAppliance) {
  delete mongoose.models.AssignmentAppliance;
}

export const AssignmentApplianceModel = mongoose.model('AssignmentAppliance', AssignmentApplianceSchema);
