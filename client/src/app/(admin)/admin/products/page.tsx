/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Product } from "@/types/product";
import {
  deleteProduct,
  getProducts,
  updateProduct,
  addProduct,
} from "@/services/api";

export default function ProductsPage() {
  const [uploading, setUploading] = useState(false);
  const [editUploading, setEditUploading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [addingProduct, setAddingProduct] = useState<any>(null);
  const [deleteProductData, setDeleteProductData] = useState<Product | null>(
    null,
  );

  const fetchData = async () => {
    const res = await getProducts(1, 100);
    setProducts(res?.data ?? []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ================= UPDATE =================
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const originalPrice = Number(editingProduct.originalPrice);
    const discountedPrice = Number(editingProduct.discountedPrice);

    if (discountedPrice > originalPrice) {
      alert("Discount price can't be greater");
      return;
    }

    const discountPercentage = Math.round(
      ((originalPrice - discountedPrice) / originalPrice) * 100,
    );

    await updateProduct(editingProduct._id, {
      ...editingProduct,
      originalPrice,
      discountedPrice,
      discountPercentage,
    });

    setEditingProduct(null);
    fetchData();
  };

  // ================= ADD =================
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingProduct) return;

    const originalPrice = Number(addingProduct.originalPrice);
    const discountedPrice = Number(addingProduct.discountedPrice);

    if (discountedPrice > originalPrice) {
      alert("Discounted price cannot be greater");
      return;
    }

    await addProduct({
      ...addingProduct,
      originalPrice,
      discountedPrice,
    });

    setAddingProduct(null);
    fetchData();
  };

  // ================= DELETE =================
  const confirmDelete = async () => {
    if (!deleteProductData) return;

    await deleteProduct(deleteProductData._id);
    setProducts((prev) => prev.filter((p) => p._id !== deleteProductData._id));
    setDeleteProductData(null);
  };

  // ================= IMAGE UPLOAD (Add) =================
  const handleImageUpload = async (e: any) => {
    const files = e.target.files;
    if (!files.length) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        formData.append("upload_preset", "ecommerce_upload");

        const res = await fetch(
          "https://api.cloudinary.com/v1_1/ps6g4nx2/image/upload",
          { method: "POST", body: formData },
        );

        const data = await res.json();
        uploadedUrls.push(data.secure_url);
      }

      setAddingProduct({
        ...addingProduct,
        images: uploadedUrls,
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      alert("Image upload failed ❌");
    } finally {
      setUploading(false);
    }
  };

  // ================= IMAGE UPLOAD (Edit) =================
  const handleEditImageUpload = async (e: any) => {
    const files = e.target.files;
    if (!files.length) return;

    setEditUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        formData.append("upload_preset", "ecommerce_upload");

        const res = await fetch(
          "https://api.cloudinary.com/v1_1/ps6g4nx2/image/upload",
          { method: "POST", body: formData },
        );

        const data = await res.json();
        uploadedUrls.push(data.secure_url);
      }

      setEditingProduct({
        ...editingProduct,
        images: [...(editingProduct.images || []), ...uploadedUrls],
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      alert("Image upload failed ❌");
    } finally {
      setEditUploading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-gray-500">{products.length} total products</p>
        </div>

        <button
          className="bg-orange-500 text-white px-4 py-2 rounded-lg"
          onClick={() =>
            setAddingProduct({
              name: "",
              description: "",
              originalPrice: "",
              discountedPrice: "",
              images: [],
              category: "",
              subcategory: "",
              stock: 1,
              isFeatured: false,
            })
          }
        >
          + Add Product
        </button>
      </div>

      {/* LIST */}
      <div className="space-y-4">
        {products.map((item) => (
          <div
            key={item._id}
            className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm"
          >
            <div className="flex gap-4 items-center">
              {item.images?.[0] ? (
                <Image
                  src={item.images[0]}
                  alt={item.name}
                  width={56}
                  height={56}
                  className="rounded-lg object-cover w-14 h-14"
                />
              ) : (
                <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center text-xs">
                  No Image
                </div>
              )}
              <div>
                <h2 className="font-semibold">{item.name}</h2>
                <p className="text-sm text-gray-500">
                  {item.category} → {item.subcategory}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {item.isFeatured && (
                <span className="bg-orange-100 text-orange-500 px-3 py-1 rounded-full text-xs">
                  Featured
                </span>
              )}

              <div className="text-right">
                <p className="text-orange-500 font-semibold">
                  ৳{item.discountedPrice}
                </p>
                <p className="text-gray-400 line-through text-sm">
                  ৳{item.originalPrice}
                </p>
              </div>

              <Pencil
                className="cursor-pointer"
                onClick={() => setEditingProduct(item)}
              />
              <Trash2
                className="text-red-500 cursor-pointer"
                onClick={() => setDeleteProductData(item)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ================= EDIT MODAL ================= */}
      {editingProduct && (
        <Modal title="Edit Product" onClose={() => setEditingProduct(null)}>
          <form onSubmit={handleUpdate} className="space-y-4">
            <Input
              label="Product Name"
              value={editingProduct.name}
              onChange={(v: any) =>
                setEditingProduct({ ...editingProduct, name: v })
              }
            />
            <Textarea
              label="Description"
              value={editingProduct.description}
              onChange={(v: any) =>
                setEditingProduct({ ...editingProduct, description: v })
              }
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Original Price"
                type="number"
                value={editingProduct.originalPrice}
                onChange={(v: any) =>
                  setEditingProduct({ ...editingProduct, originalPrice: v })
                }
              />
              <Input
                label="Discounted Price"
                type="number"
                value={editingProduct.discountedPrice}
                onChange={(v: any) =>
                  setEditingProduct({ ...editingProduct, discountedPrice: v })
                }
              />
            </div>

            {/* TOGGLE */}
            <Toggle
              value={editingProduct.isFeatured}
              onChange={() =>
                setEditingProduct({
                  ...editingProduct,
                  isFeatured: !editingProduct.isFeatured,
                })
              }
            />

            {/* IMAGE UPLOAD */}
            <div>
              <label className="block text-sm mb-2 font-medium">
                Product Images
              </label>

              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleEditImageUpload}
                className="w-full border p-2 rounded-lg"
              />
            </div>

            {editUploading && (
              <p className="text-sm text-orange-500 mt-2">
                Uploading images...
              </p>
            )}

            {/* Preview */}
            <div className="flex gap-3 flex-wrap mt-3">
              {editingProduct.images?.map((img: string, i: number) =>
                img ? (
                  <div key={i} className="relative">
                    <Image
                      src={img}
                      alt="preview"
                      width={80}
                      height={80}
                      className="object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = editingProduct.images.filter(
                          (_: any, index: number) => index !== i,
                        );
                        setEditingProduct({
                          ...editingProduct,
                          images: newImages,
                        });
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full px-2 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : null,
              )}
            </div>

            <button className="w-full bg-orange-500 text-white py-2 rounded-lg">
              Update Product
            </button>
          </form>
        </Modal>
      )}

      {/* ================= ADD MODAL ================= */}
      {addingProduct && (
        <Modal title="Add Product" onClose={() => setAddingProduct(null)}>
          <form onSubmit={handleAdd} className="space-y-4">
            <Input
              label="Product Name"
              value={addingProduct.name}
              onChange={(v: any) =>
                setAddingProduct({ ...addingProduct, name: v })
              }
            />
            <Textarea
              label="Description"
              value={addingProduct.description}
              onChange={(v: any) =>
                setAddingProduct({ ...addingProduct, description: v })
              }
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Original Price"
                type="number"
                value={addingProduct.originalPrice}
                onChange={(v: any) =>
                  setAddingProduct({ ...addingProduct, originalPrice: v })
                }
              />
              <Input
                label="Discounted Price"
                type="number"
                value={addingProduct.discountedPrice}
                onChange={(v: any) =>
                  setAddingProduct({ ...addingProduct, discountedPrice: v })
                }
              />
            </div>

            <div>
              <label className="block text-sm mb-1 font-medium">Category</label>
              <select
                value={addingProduct.category}
                onChange={(e) =>
                  setAddingProduct({
                    ...addingProduct,
                    category: e.target.value,
                    subcategory: "",
                  })
                }
                className="w-full border p-2 rounded-lg"
              >
                <option value="">Select Category</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
              </select>
            </div>

            <Input
              label="Subcategory"
              value={addingProduct.subcategory}
              onChange={(v: any) =>
                setAddingProduct({ ...addingProduct, subcategory: v })
              }
            />

            {/* TOGGLE */}
            <Toggle
              value={addingProduct.isFeatured}
              onChange={() =>
                setAddingProduct({
                  ...addingProduct,
                  isFeatured: !addingProduct.isFeatured,
                })
              }
            />

            <div>
              <label className="block text-sm mb-2 font-medium">
                Product Images
              </label>

              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full border p-2 rounded-lg"
              />
            </div>

            {uploading && (
              <p className="text-sm text-orange-500 mt-2">
                Uploading images...
              </p>
            )}

            {/* Preview */}
            <div className="flex gap-3 flex-wrap mt-3">
              {addingProduct.images?.map((img: string, i: number) =>
                img ? (
                  <div key={i} className="relative">
                    <Image
                      src={img}
                      alt="preview"
                      width={80}
                      height={80}
                      className="object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = addingProduct.images.filter(
                          (_: any, index: number) => index !== i,
                        );
                        setAddingProduct({
                          ...addingProduct,
                          images: newImages,
                        });
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full px-2 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : null,
              )}
            </div>

            <button className="w-full bg-orange-500 text-white py-2 rounded-lg">
              Add Product
            </button>
          </form>
        </Modal>
      )}

      {/* ================= DELETE CONFIRMATION ================= */}
      {deleteProductData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-lg">
            <h2 className="text-lg font-semibold mb-2">Delete Product</h2>

            <p className="text-gray-500 text-sm mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-black">
                {deleteProductData.name}
              </span>
              ?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteProductData(null)}
                className="px-4 py-2 border rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* COMPONENTS */

const Modal = ({ title, children, onClose }: any) => (
  <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
    <div className="bg-white w-full max-w-lg rounded-xl p-6 relative">
      <button onClick={onClose} className="absolute right-4 top-4">
        ✕
      </button>
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {children}
    </div>
  </div>
);

const Input = ({ label, value, onChange, type = "text" }: any) => (
  <div>
    <label className="text-sm font-medium">{label}</label>
    <input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border rounded-lg px-3 py-2 mt-1"
      required
    />
  </div>
);

const Textarea = ({ label, value, onChange }: any) => (
  <div>
    <label className="text-sm font-medium">{label}</label>
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border rounded-lg px-3 py-2 mt-1"
      required
    />
  </div>
);

const Toggle = ({ value, onChange }: any) => (
  <div className="flex justify-between items-center">
    <span className="text-sm font-medium">Featured</span>
    <button
      type="button"
      onClick={onChange}
      className={`w-12 h-6 rounded-full p-1 ${
        value ? "bg-orange-500" : "bg-gray-300"
      }`}
    >
      <div
        className={`bg-white w-4 h-4 rounded-full transition ${
          value ? "translate-x-6" : ""
        }`}
      />
    </button>
  </div>
);
