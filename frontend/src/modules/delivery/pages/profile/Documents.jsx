import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileCheck, UploadCloud, XCircle, Clock } from "lucide-react";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import { toast } from "sonner";

const Documents = () => {
  const navigate = useNavigate();
  const [previewDoc, setPreviewDoc] = useState(null);

  const [docs, setDocs] = useState([
    {
      id: 1,
      title: "Aadhar Card",
      status: "Verified",
      uploadedOn: "12 Jan 2024",
      fileName: "aadhar_front_back.pdf",
    },
    {
      id: 2,
      title: "PAN Card",
      status: "Verified",
      uploadedOn: "12 Jan 2024",
      fileName: "pan_card.jpg",
    },
    {
      id: 3,
      title: "Driving License",
      status: "Verified",
      uploadedOn: "15 Jan 2024",
      fileName: "dl_front.jpg",
    },
    {
      id: 4,
      title: "Police Clearance",
      status: "Pending",
      uploadedOn: "20 Feb 2024",
      fileName: "pcc_receipt.pdf",
    },
    {
      id: 5,
      title: "Bank Passbook",
      status: "Rejected",
      reason: "Image blurry, please re-upload",
      fileName: null,
    },
  ]);

  const handleUpload = (id) => {
    toast.info("Upload functionality would open file picker here");
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Verified":
        return (
          <span className="flex items-center text-brand-600 bg-brand-50 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
            <FileCheck size={12} className="mr-1" /> Verified
          </span>
        );
      case "Pending":
        return (
          <span className="flex items-center text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
            <Clock size={12} className="mr-1" /> Pending
          </span>
        );
      case "Rejected":
        return (
          <span className="flex items-center text-red-600 bg-red-50 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
            <XCircle size={12} className="mr-1" /> Rejected
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 pt-[72px]">
      {/* Header */}
      <div className="bg-white shadow-sm fixed top-0 w-full max-w-md inset-x-0 mx-auto z-30">
        <div className="flex items-center p-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-2"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="ds-h3 text-gray-900">My Documents</h1>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {docs.map((doc) => (
          <Card key={doc.id} className="p-4 border border-gray-100">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-gray-800">{doc.title}</h4>
              {getStatusBadge(doc.status)}
            </div>

            {doc.fileName && (
              <p className="text-xs text-gray-500 mb-3 flex items-center">
                <span className="truncate max-w-[200px]">{doc.fileName}</span>
                <span className="mx-2">•</span>
                <span>{doc.uploadedOn}</span>
              </p>
            )}

            {doc.status === "Rejected" && (
              <div className="bg-red-50 text-red-700 text-xs p-2 rounded mb-3">
                Reason: {doc.reason}
              </div>
            )}

            <div className="flex space-x-2">
              {doc.status !== "Verified" && (
                <Button 
                  size="sm" 
                  className="w-full text-xs h-8" 
                  onClick={() => handleUpload(doc.id)}
                >
                  <UploadCloud size={14} className="mr-1" /> 
                  {doc.status === "Rejected" ? "Re-upload" : "Update"}
                </Button>
              )}
              {doc.fileName && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs h-8"
                  onClick={() => setPreviewDoc(doc)}
                >
                  View File
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-900">{previewDoc.title}</h3>
                <p className="text-xs text-gray-500">{previewDoc.fileName}</p>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 text-gray-700"
              >
                <XCircle size={20} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center justify-center bg-gray-100 min-h-[300px]">
              <FileCheck size={64} className="text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium text-sm mb-6 text-center">
                This is a preview of your uploaded document.
              </p>
              <img 
                src={`https://placehold.co/400x300/e2e8f0/64748b?text=${encodeURIComponent(previewDoc.title)}`} 
                alt={previewDoc.title}
                className="rounded-lg border shadow-sm max-w-full"
              />
            </div>
            <div className="p-4 border-t bg-white">
              <Button className="w-full" onClick={() => setPreviewDoc(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
