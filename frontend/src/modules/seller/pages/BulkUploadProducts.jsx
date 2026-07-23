import React, { useState, useEffect } from "react";
import Button from "@shared/components/ui/Button";
import Badge from "@shared/components/ui/Badge";
import Card from "@shared/components/ui/Card";
import {
  HiOutlineArrowLeft,
  HiOutlineDocumentArrowUp,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineArrowPath,
  HiOutlineTableCells,
  HiOutlineCloudArrowUp,
} from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import { sellerApi } from "../services/sellerApi";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const BulkUploadProducts = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("csv"); // "csv" | "grid"
  const [dbCategories, setDbCategories] = useState([]);
  const [isLoadingCats, setIsLoadingCats] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // States for Excel/CSV tab
  const [csvFile, setCsvFile] = useState(null);
  const [parsedProducts, setParsedProducts] = useState([]);
  const [parsingErrors, setParsingErrors] = useState([]);

  // States for Grid tab
  const [gridRows, setGridRows] = useState([
    {
      id: Date.now(),
      name: "",
      description: "",
      brand: "",
      sku: "",
      weight: "",
      price: "",
      salePrice: "",
      stock: "",
      tags: "",
      headerId: "",
      categoryId: "",
      subcategoryId: "",
      mainImage: "",
      galleryImages: "",
    },
  ]);

  // Load Categories on mount
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await sellerApi.getCategoryTree();
        if (res.data.success) {
          setDbCategories(res.data.results || res.data.result || []);
        }
      } catch (error) {
        toast.error("Failed to load categories");
      } finally {
        setIsLoadingCats(false);
      }
    };
    fetchCats();
  }, []);

  // Helper: Download Sample CSV Template
  const downloadTemplate = () => {
    const headers = [
      "Product Name*",
      "Description",
      "Brand",
      "SKU",
      "Weight",
      "Price*",
      "Sale Price",
      "Stock*",
      "Tags (Comma Separated)",
      "Main Group (Main Category)*",
      "Specific Category*",
      "Sub-Category*",
      "Main Image URL",
      "Gallery Image URLs (Comma Separated)",
    ];

    const sampleRow = [
      "Fresh organic Bananas",
      "High quality yellow bananas sourced locally",
      "Organic Fresh",
      "BAN-001",
      "1 kg",
      "120",
      "99",
      "50",
      "fruits,organic,fresh",
      dbCategories[0]?.name || "Grocery & Staples",
      dbCategories[0]?.children?.[0]?.name || "Vegetables & Fruits",
      dbCategories[0]?.children?.[0]?.children?.[0]?.name || "Fresh Fruits",
      "https://example.com/banana.jpg",
      "https://example.com/banana-back.jpg,https://example.com/banana-side.jpg",
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), sampleRow.join(",")].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bulk_product_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Excel/CSV File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // Convert to JSON array of arrays
        const csvRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (csvRows.length < 2) {
          toast.error("File must contain headers and at least one product row");
          return;
        }

        const headers = csvRows[0].map((h) => String(h || "").trim().toLowerCase());
        const rawRows = csvRows.slice(1);
        const parsed = [];
        const errs = [];

        rawRows.forEach((row, index) => {
          if (!row || row.length === 0 || row.every(val => val === null || val === undefined || String(val).trim() === "")) return;

          // Map headers to keys
          const getVal = (possibleHeaders) => {
            const matchIndex = headers.findIndex((h) =>
              possibleHeaders.some((ph) => h.includes(ph.toLowerCase()))
            );
            return matchIndex !== -1 ? String(row[matchIndex] ?? "").trim() : "";
          };

          const name = getVal(["product name", "name", "title"]);
          const description = getVal(["description", "desc", "about"]);
          const brand = getVal(["brand"]);
          const sku = getVal(["sku", "code", "product code"]);
          const weight = getVal(["weight"]);
          const price = getVal(["price"]);
          const salePrice = getVal(["sale price", "sale_price", "discounted price"]);
          const stock = getVal(["stock", "quantity", "qty"]);
          const tags = getVal(["tags"]);
          const mainGroupName = getVal(["main group", "main category", "header"]);
          const catName = getVal(["specific category", "category"]);
          const subcatName = getVal(["sub-category", "subcategory"]);
          const mainImage = getVal(["main image", "image url", "image"]);
          const galleryImages = getVal(["gallery", "gallery images"]);

          const rowNum = index + 2;
          let validationError = null;

          if (!name) {
            validationError = `Row ${rowNum}: Product Name is required`;
          } else if (!price || isNaN(Number(price))) {
            validationError = `Row ${rowNum}: Valid Price is required`;
          } else if (!stock || isNaN(Number(stock))) {
            validationError = `Row ${rowNum}: Valid Stock is required`;
          }

          let headerId = "";
          let categoryId = "";
          let subcategoryId = "";

          if (!validationError) {
            const matchedHeader = dbCategories.find(
              (h) => h.name.toLowerCase().trim() === mainGroupName.toLowerCase().trim()
            );
            if (!matchedHeader) {
              validationError = `Row ${rowNum}: Main Group "${mainGroupName}" not found in system categories`;
            } else {
              headerId = matchedHeader._id || matchedHeader.id;

              // Find Specific Category (fuzzy / case-insensitive)
              let matchedCat = matchedHeader.children?.find(
                (c) => c.name.toLowerCase().trim() === catName.toLowerCase().trim()
              );

              if (!matchedCat && catName) {
                // Try to find if catName is a substring, or vice-versa
                matchedCat = matchedHeader.children?.find(
                  (c) => c.name.toLowerCase().includes(catName.toLowerCase().trim()) ||
                         catName.toLowerCase().trim().includes(c.name.toLowerCase())
                );
              }

              // Fallback to first category if not found
              if (!matchedCat && matchedHeader.children?.length > 0) {
                matchedCat = matchedHeader.children[0];
              }

              if (!matchedCat) {
                validationError = `Row ${rowNum}: No category found under Main Group "${mainGroupName}"`;
              } else {
                categoryId = matchedCat._id || matchedCat.id;

                // Find Sub-Category (fuzzy / case-insensitive)
                let matchedSubcat = matchedCat.children?.find(
                  (sc) => sc.name.toLowerCase().trim() === subcatName.toLowerCase().trim()
                );

                if (!matchedSubcat && subcatName) {
                  // Try to find if subcatName is a substring, or vice-versa
                  matchedSubcat = matchedCat.children?.find(
                    (sc) => sc.name.toLowerCase().includes(subcatName.toLowerCase().trim()) ||
                           subcatName.toLowerCase().trim().includes(sc.name.toLowerCase())
                  );
                }

                // Fallback to first subcategory if not found
                if (!matchedSubcat && matchedCat.children?.length > 0) {
                  matchedSubcat = matchedCat.children[0];
                }

                if (!matchedSubcat) {
                  validationError = `Row ${rowNum}: No sub-category found under Category "${matchedCat.name}"`;
                } else {
                  subcategoryId = matchedSubcat._id || matchedSubcat.id;
                }
              }
            }
          }

          if (validationError) {
            errs.push(validationError);
          } else {
            parsed.push({
              name,
              description,
              brand,
              sku,
              weight,
              price: Number(price),
              salePrice: salePrice ? Number(salePrice) : 0,
              stock: Number(stock),
              tags,
              headerId,
              categoryId,
              subcategoryId,
              mainImage,
              galleryImages,
            });
          }
        });

        setParsedProducts(parsed);
        setParsingErrors(errs);
        if (errs.length > 0) {
          toast.warning(`Parsed with ${errs.length} validation errors.`);
        } else {
          toast.success(`Successfully parsed ${parsed.length} products!`);
        }
      } catch (err) {
        toast.error("Failed to parse sheet. Please ensure it is a valid Excel or CSV file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Submit Parsed CSV Products
  const handlePublishCsv = async () => {
    if (parsedProducts.length === 0) {
      toast.error("No valid products to publish");
      return;
    }
    setIsSaving(true);
    try {
      const response = await sellerApi.bulkCreateProducts({ products: parsedProducts });
      if (response.data.success) {
        toast.success(response.data.message || "Bulk products published successfully!");
        navigate("/seller/products");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to publish products");
    } finally {
      setIsSaving(false);
    }
  };

  // Grid Actions
  const addGridRow = () => {
    setGridRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: "",
        description: "",
        brand: "",
        sku: "",
        weight: "",
        price: "",
        salePrice: "",
        stock: "",
        tags: "",
        headerId: "",
        categoryId: "",
        subcategoryId: "",
        mainImage: "",
        galleryImages: "",
      },
    ]);
  };

  const removeGridRow = (id) => {
    if (gridRows.length === 1) {
      toast.error("Must keep at least one row");
      return;
    }
    setGridRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateGridRowValue = (id, field, value) => {
    setGridRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        // Reset dependent categories if parent category changes
        if (field === "headerId") {
          updated.categoryId = "";
          updated.subcategoryId = "";
        } else if (field === "categoryId") {
          updated.subcategoryId = "";
        }
        return updated;
      })
    );
  };

  // Publish Grid Rows
  const handlePublishGrid = async () => {
    // Validate rows
    const validationErrors = [];
    const formattedProducts = gridRows.map((row, index) => {
      const idx = index + 1;
      if (!row.name) validationErrors.push(`Row ${idx}: Product title is required`);
      if (!row.price || isNaN(Number(row.price))) validationErrors.push(`Row ${idx}: Valid Price is required`);
      if (!row.stock || isNaN(Number(row.stock))) validationErrors.push(`Row ${idx}: Valid Stock is required`);
      if (!row.headerId || !row.categoryId || !row.subcategoryId) {
        validationErrors.push(`Row ${idx}: Main Group, Category and Sub-category are all required`);
      }

      return {
        name: row.name,
        description: row.description,
        brand: row.brand,
        sku: row.sku,
        weight: row.weight,
        price: Number(row.price),
        salePrice: row.salePrice ? Number(row.salePrice) : 0,
        stock: Number(row.stock),
        tags: row.tags,
        headerId: row.headerId,
        categoryId: row.categoryId,
        subcategoryId: row.subcategoryId,
        mainImage: row.mainImage,
        galleryImages: row.galleryImages,
      };
    });

    if (validationErrors.length > 0) {
      validationErrors.forEach((err) => toast.error(err));
      return;
    }

    setIsSaving(true);
    try {
      const response = await sellerApi.bulkCreateProducts({ products: formattedProducts });
      if (response.data.success) {
        toast.success(response.data.message || "Bulk products published successfully!");
        navigate("/seller/products");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to publish products");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Button
            variant="ghost"
            className="pl-0 hover:bg-transparent hover:text-primary-600 text-slate-500 font-bold"
            onClick={() => navigate(-1)}
          >
            <HiOutlineArrowLeft className="mr-2 h-5 w-5" />
            Back to Products
          </Button>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight mt-1">
            Bulk Product Upload Panel
          </h1>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1">
            Fast track your catalog expansion
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("csv")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "csv"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <HiOutlineDocumentArrowUp className="h-4 w-4" />
            <span>Excel / CSV File</span>
          </button>
          <button
            onClick={() => setActiveTab("grid")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === "grid"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <HiOutlineTableCells className="h-4 w-4" />
            <span>Grid Row Entry</span>
          </button>
        </div>
      </div>

      {isLoadingCats ? (
        <Card className="flex flex-col items-center justify-center p-12 space-y-4 border border-slate-100 shadow-xl">
          <HiOutlineArrowPath className="h-8 w-8 text-primary animate-spin" />
          <p className="text-slate-500 text-sm font-bold">Loading product categories...</p>
        </Card>
      ) : (
        <>
          {/* TAB 1: CSV FILE UPLOAD */}
          {activeTab === "csv" && (
            <div className="space-y-6">
              {/* Instructions and Download Template */}
              <Card className="p-6 border border-slate-100 shadow-sm space-y-4 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-800">
                      Step 1: Download & Prepare Template
                    </h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-2xl">
                      Download the CSV template. Fill in the columns exactly as shown. For categories, use names matching the system category hierarchy exactly. Images can be supplied via URLs.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
                    onClick={downloadTemplate}
                  >
                    Download CSV Template
                  </Button>
                </div>
              </Card>

              {/* Drag and Drop Upload */}
              <div className="border-2 border-dashed border-slate-200 rounded-2xl bg-white p-12 text-center hover:border-slate-400 hover:bg-slate-50/50 transition-all flex flex-col items-center justify-center cursor-pointer relative group">
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="h-14 w-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <HiOutlineCloudArrowUp className="h-7 w-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 mt-4">
                  {csvFile ? csvFile.name : "Choose CSV file to upload"}
                </h4>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Drag and drop your file here, or click to browse
                </p>
              </div>

              {/* Validation Errors Panel */}
              {parsingErrors.length > 0 && (
                <Card className="p-5 border-rose-100 bg-rose-50/30 space-y-3">
                  <h4 className="text-xs font-bold text-rose-600 flex items-center gap-1.5 uppercase tracking-wider">
                    <HiOutlineExclamationTriangle className="h-4 w-4" />
                    Validation Errors Found ({parsingErrors.length})
                  </h4>
                  <ul className="text-xs text-rose-700 font-medium space-y-1.5 list-disc pl-5 max-h-48 overflow-y-auto custom-scrollbar">
                    {parsingErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Parsed Preview Table */}
              {parsedProducts.length > 0 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      Parsed Products Preview
                      <Badge variant="success" className="text-[10px] px-2 py-0.5">
                        {parsedProducts.length} Ready
                      </Badge>
                    </h3>
                    <Button
                      onClick={handlePublishCsv}
                      disabled={isSaving || parsingErrors.length > 0}
                      className="min-w-[150px] font-bold bg-black text-white hover:bg-slate-800"
                    >
                      {isSaving ? (
                        <>
                          <HiOutlineArrowPath className="mr-2 h-4 w-4 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        "Publish All Products"
                      )}
                    </Button>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl shadow-xl overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead className="bg-slate-50/50">
                        <tr>
                          {["Title", "Price", "Stock", "Weight", "Brand", "Main Image"].map((head) => (
                            <th
                              key={head}
                              className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest"
                            >
                              {head}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {parsedProducts.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/45">
                            <td className="px-6 py-4 max-w-[200px] truncate font-bold text-slate-900">
                              {p.name}
                            </td>
                            <td className="px-6 py-4">₹{p.price}</td>
                            <td className="px-6 py-4">{p.stock} units</td>
                            <td className="px-6 py-4">{p.weight || "-"}</td>
                            <td className="px-6 py-4">{p.brand || "-"}</td>
                            <td className="px-6 py-4">
                              {p.mainImage ? (
                                <img
                                  src={p.mainImage}
                                  alt="Preview"
                                  className="w-8 h-8 rounded object-cover border border-slate-100"
                                />
                              ) : (
                                <span className="text-slate-400">None</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INTERACTIVE GRID ENTRY */}
          {activeTab === "grid" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Button
                  onClick={addGridRow}
                  variant="outline"
                  className="font-bold border-slate-200 hover:bg-slate-50"
                >
                  <HiOutlinePlus className="h-4 w-4 mr-2" />
                  Add New Row
                </Button>
                <Button
                  onClick={handlePublishGrid}
                  disabled={isSaving}
                  className="min-w-[150px] font-bold bg-black text-white hover:bg-slate-800"
                >
                  {isSaving ? (
                    <>
                      <HiOutlineArrowPath className="mr-2 h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    "Publish Grid Products"
                  )}
                </Button>
              </div>

              {/* Grid Scrollable Wrapper */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-xl overflow-x-auto min-h-[400px]">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50/50">
                    <tr>
                      {[
                        "Title*",
                        "Price*",
                        "Sale Price",
                        "Stock*",
                        "Main Group*",
                        "Category*",
                        "Sub-Category*",
                        "Weight",
                        "Brand",
                        "Main Image",
                        "Actions",
                      ].map((head) => (
                        <th
                          key={head}
                          className="px-4 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap"
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {gridRows.map((row, index) => (
                      <tr key={row.id} className="hover:bg-slate-50/45">
                        {/* Title */}
                        <td className="px-2 py-3 min-w-[180px]">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => updateGridRowValue(row.id, "name", e.target.value)}
                            placeholder="e.g. Tomato Hybrid"
                            className="w-full px-2.5 py-1.5 bg-slate-50 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/10 border-none"
                          />
                        </td>

                        {/* Price */}
                        <td className="px-2 py-3 w-24">
                          <input
                            type="number"
                            value={row.price}
                            onChange={(e) => updateGridRowValue(row.id, "price", e.target.value)}
                            placeholder="100"
                            className="w-full px-2.5 py-1.5 bg-slate-50 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 border-none"
                          />
                        </td>

                        {/* Sale Price */}
                        <td className="px-2 py-3 w-24">
                          <input
                            type="number"
                            value={row.salePrice}
                            onChange={(e) =>
                              updateGridRowValue(row.id, "salePrice", e.target.value)
                            }
                            placeholder="85"
                            className="w-full px-2.5 py-1.5 bg-slate-50 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 border-none"
                          />
                        </td>

                        {/* Stock */}
                        <td className="px-2 py-3 w-24">
                          <input
                            type="number"
                            value={row.stock}
                            onChange={(e) => updateGridRowValue(row.id, "stock", e.target.value)}
                            placeholder="20"
                            className="w-full px-2.5 py-1.5 bg-slate-50 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 border-none"
                          />
                        </td>

                        {/* Main Group */}
                        <td className="px-2 py-3 min-w-[150px]">
                          <select
                            value={row.headerId}
                            onChange={(e) => updateGridRowValue(row.id, "headerId", e.target.value)}
                            className="w-full px-2 py-1.5 bg-slate-50 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 border-none appearance-none cursor-pointer"
                          >
                            <option value="">Select Main Group</option>
                            {dbCategories.map((h) => (
                              <option key={h._id || h.id} value={h._id || h.id}>
                                {h.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Category */}
                        <td className="px-2 py-3 min-w-[150px]">
                          <select
                            value={row.categoryId}
                            onChange={(e) =>
                              updateGridRowValue(row.id, "categoryId", e.target.value)
                            }
                            disabled={!row.headerId}
                            className="w-full px-2 py-1.5 bg-slate-50 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 border-none disabled:opacity-50 appearance-none cursor-pointer"
                          >
                            <option value="">Select Category</option>
                            {dbCategories
                              .find((h) => (h._id || h.id) === row.headerId)
                              ?.children?.map((c) => (
                                <option key={c._id || c.id} value={c._id || c.id}>
                                  {c.name}
                                </option>
                              ))}
                          </select>
                        </td>

                        {/* Sub-Category */}
                        <td className="px-2 py-3 min-w-[150px]">
                          <select
                            value={row.subcategoryId}
                            onChange={(e) =>
                              updateGridRowValue(row.id, "subcategoryId", e.target.value)
                            }
                            disabled={!row.categoryId}
                            className="w-full px-2 py-1.5 bg-slate-50 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 border-none disabled:opacity-50 appearance-none cursor-pointer"
                          >
                            <option value="">Select Sub-Category</option>
                            {dbCategories
                              .find((h) => (h._id || h.id) === row.headerId)
                              ?.children?.find((c) => (c._id || c.id) === row.categoryId)
                              ?.children?.map((sc) => (
                                <option key={sc._id || sc.id} value={sc._id || sc.id}>
                                  {sc.name}
                                </option>
                              ))}
                          </select>
                        </td>

                        {/* Weight */}
                        <td className="px-2 py-3 w-28">
                          <input
                            type="text"
                            value={row.weight}
                            onChange={(e) => updateGridRowValue(row.id, "weight", e.target.value)}
                            placeholder="500 g"
                            className="w-full px-2.5 py-1.5 bg-slate-50 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/10 border-none"
                          />
                        </td>

                        {/* Brand */}
                        <td className="px-2 py-3 w-28">
                          <input
                            type="text"
                            value={row.brand}
                            onChange={(e) => updateGridRowValue(row.id, "brand", e.target.value)}
                            placeholder="Heinz"
                            className="w-full px-2.5 py-1.5 bg-slate-50 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/10 border-none"
                          />
                        </td>

                        {/* Main Image Upload / Preview */}
                        <td className="px-2 py-3 min-w-[140px]">
                          {row.mainImage ? (
                            <div className="flex items-center space-x-2">
                              <img
                                src={row.mainImage}
                                alt="Preview"
                                className="w-10 h-10 rounded object-cover border border-slate-100 shadow-sm"
                              />
                              <button
                                onClick={() => updateGridRowValue(row.id, "mainImage", "")}
                                className="text-[10px] font-bold text-rose-500 hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <div className="relative inline-block">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      updateGridRowValue(row.id, "mainImage", reader.result);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                              <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 rounded-lg pointer-events-none">
                                + Add Image
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Delete Row */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => removeGridRow(row.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <HiOutlineTrash className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BulkUploadProducts;
