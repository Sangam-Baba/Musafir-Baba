"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DownloadCloud, UploadCloud, Search, Plus, Loader2, Edit, Trash2, ChevronLeft, ChevronRight, Power } from "lucide-react";
import { secureAdminFetch } from "@/lib/secureAdminFetch";

export default function WorkLocationsPage() {
  return (
    <div className="p-6 max-w-[1200px] mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Location Master</h1>
        <p className="text-muted-foreground mt-2">
          Manage geographical hierarchy and upload multiple locations via Excel.
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="countries" className="py-2">Countries</TabsTrigger>
          <TabsTrigger value="states" className="py-2">States</TabsTrigger>
          <TabsTrigger value="cities" className="py-2">Cities</TabsTrigger>
          <TabsTrigger value="pincodes" className="py-2">PIN Codes</TabsTrigger>
          <TabsTrigger value="upload" className="py-2">Excel Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="countries"><CountryTab /></TabsContent>
        <TabsContent value="states"><StateTab /></TabsContent>
        <TabsContent value="cities"><CityTab /></TabsContent>
        <TabsContent value="pincodes"><PincodeTab /></TabsContent>
        <TabsContent value="upload"><ExcelUploadTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ----------------------------------------------------
// EXCEL UPLOAD TAB
// ----------------------------------------------------
function ExcelUploadTab() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleDownloadSample = async () => {
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/locations/sample`);
      if (!res.ok) throw new Error("Failed to download sample");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Location_Sample.xlsx";
      a.click();
    } catch (error: any) {
      toast.error(error.message || "Failed to download sample");
    }
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a file to upload");
    setLoading(true);
    setErrors([]);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/locations/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        if (data.errors) {
          setErrors(data.errors);
          toast.error("File processed with errors. Please check the error report.");
        } else {
          toast.error(data.message || "Upload failed");
        }
      } else {
        toast.success(data.message || "Data uploaded successfully");
        setFile(null);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload Locations</CardTitle>
        <CardDescription>Upload an Excel file containing your locations data hierarchy.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 items-center">
          <Input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <Button onClick={handleUpload} disabled={!file || loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            Upload
          </Button>
          <Button variant="outline" onClick={handleDownloadSample}>
            <DownloadCloud className="mr-2 h-4 w-4" />
            Download Sample
          </Button>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200 h-64 overflow-y-auto">
            <h4 className="font-semibold mb-2">Upload Errors ({errors.length})</h4>
            <ul className="list-disc pl-5 space-y-1">
              {errors.map((err, i) => <li key={i} className="text-sm">{err}</li>)}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------
// COUNTRY TAB (Simplified Implementation)
// ----------------------------------------------------
function CountryTab() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  
  const [editItem, setEditItem] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/countries?search=${search}&page=${page}&limit=10`);
      const json = await res.json();
      if (json.success) {
         setData(json.data);
         if (json.pagination) setTotalPages(json.pagination.pages);
      }
    } catch (err) {
      toast.error("Failed to load countries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, page]);
  
  // reset page on search
  useEffect(() => { setPage(1); }, [search]);

  const handleAdd = async () => {
    if (!newName || !newCode) return toast.error("Name and Code are required");
    setSaving(true);
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/countries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, code: newCode })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Country added successfully");
        setIsAddOpen(false);
        setNewName("");
        setNewCode("");
        fetchData();
      } else {
        toast.error(json.message || "Failed to add country");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add country");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setEditName(item.name);
    setEditCode(item.code || "");
  };

  const handleEdit = async () => {
    if (!editName) return toast.error("Name is required");
    setSaving(true);
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/countries/${editItem._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, code: editCode })
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Country updated");
        setEditItem(null);
        fetchData();
      } else {
        toast.error(json.message || "Failed to update country");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update country");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: any) => {
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/countries/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive })
      });
      const json = await res.json();
      if (json.success) {
        toast.success(item.isActive ? "Country deactivated" : "Country activated");
        fetchData();
      } else toast.error(json.message || "Failed to update status");
    } catch (err: any) { toast.error(err.message || "Failed to update status"); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this country?")) return;
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/countries/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Country deleted");
        fetchData();
      } else {
        toast.error(json.message || "Failed to delete country");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete country");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Countries</CardTitle>
          <CardDescription>Manage countries</CardDescription>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add Country</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Country</DialogTitle>
              <DialogDescription>Enter the country details below.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Country Name</Label>
                <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. India" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="code">Country Code (ISO)</Label>
                <Input id="code" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. IN" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Country</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Country Name</Label>
                <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-code">Country Code (ISO)</Label>
                <Input id="edit-code" value={editCode} onChange={(e) => setEditCode(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button onClick={handleEdit} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Input 
            placeholder="Search countries..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="max-w-sm"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">S.No.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10">Loading...</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10">No records found</TableCell></TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={item._id}>
                  <TableCell>{(page - 1) * 10 + index + 1}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.code}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${item.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" title={item.isActive ? "Deactivate" : "Activate"} onClick={() => handleToggleStatus(item)}><Power className={`w-4 h-4 ${item.isActive ? "text-green-600" : "text-gray-400"}`} /></Button>
                    <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(item)}><Edit className="w-4 h-4 text-blue-600" /></Button>
                    <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(item._id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-4 mt-4">
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------
// STATE TAB
// ----------------------------------------------------
function StateTab() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/states?search=${search}&page=${page}&limit=10`);
      const json = await res.json();
      if (json.success) {
         setData(json.data);
         if (json.pagination) setTotalPages(json.pagination.pages);
      }
    } catch (err) {
      toast.error("Failed to load states");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, page]);
  useEffect(() => { setPage(1); }, [search]);

  const handleEdit = async (item: any) => {
    const newName = window.prompt("Enter new state name", item.name);
    if (newName === null) return;
    if (!newName) return toast.error("Name is required");
    const newCode = window.prompt("Enter new state code (Optional)", item.code || "");
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/states/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, code: newCode === null ? item.code : newCode })
      });
      const json = await res.json();
      if (json.success) { toast.success("State updated"); fetchData(); }
      else toast.error(json.message || "Failed to update state");
    } catch (err: any) { toast.error(err.message || "Failed to update state"); }
  };

  const handleToggleStatus = async (item: any) => {
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/states/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive })
      });
      const json = await res.json();
      if (json.success) { toast.success(item.isActive ? "State deactivated" : "State activated"); fetchData(); }
      else toast.error(json.message || "Failed to update status");
    } catch (err: any) { toast.error(err.message || "Failed to update status"); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this state?")) return;
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/states/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) { toast.success("State deleted"); fetchData(); }
      else toast.error(json.message || "Failed to delete state");
    } catch (err: any) { toast.error(err.message || "Failed to delete state"); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>States</CardTitle>
          <CardDescription>Manage states under countries</CardDescription>
        </div>
        <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add State</Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Input 
            placeholder="Search states..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="max-w-sm"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">S.No.</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>State Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10">Loading...</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10">No records found</TableCell></TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={item._id}>
                  <TableCell>{(page - 1) * 10 + index + 1}</TableCell>
                  <TableCell>{item.countryId?.name || "N/A"}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.code}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${item.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" title={item.isActive ? "Deactivate" : "Activate"} onClick={() => handleToggleStatus(item)}><Power className={`w-4 h-4 ${item.isActive ? "text-green-600" : "text-gray-400"}`} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Edit className="w-4 h-4 text-blue-600" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item._id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-4 mt-4">
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------
// CITY TAB
// ----------------------------------------------------
function CityTab() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/cities?search=${search}&page=${page}&limit=10`);
      const json = await res.json();
      if (json.success) {
         setData(json.data);
         if (json.pagination) setTotalPages(json.pagination.pages);
      }
    } catch (err) {
      toast.error("Failed to load cities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, page]);
  useEffect(() => { setPage(1); }, [search]);

  const handleEdit = async (item: any) => {
    const newName = window.prompt("Enter new city name", item.name);
    if (newName === null) return;
    if (!newName) return toast.error("Name is required");
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/cities/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName })
      });
      const json = await res.json();
      if (json.success) { toast.success("City updated"); fetchData(); }
      else toast.error(json.message || "Failed to update city");
    } catch (err: any) { toast.error(err.message || "Failed to update city"); }
  };

  const handleToggleStatus = async (item: any) => {
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/cities/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive })
      });
      const json = await res.json();
      if (json.success) { toast.success(item.isActive ? "City deactivated" : "City activated"); fetchData(); }
      else toast.error(json.message || "Failed to update status");
    } catch (err: any) { toast.error(err.message || "Failed to update status"); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this city?")) return;
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/cities/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) { toast.success("City deleted"); fetchData(); }
      else toast.error(json.message || "Failed to delete city");
    } catch (err: any) { toast.error(err.message || "Failed to delete city"); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Cities</CardTitle>
          <CardDescription>Manage cities under states</CardDescription>
        </div>
        <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add City</Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Input 
            placeholder="Search cities..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="max-w-sm"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">S.No.</TableHead>
              <TableHead>State</TableHead>
              <TableHead>City Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10">Loading...</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10">No records found</TableCell></TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={item._id}>
                  <TableCell>{(page - 1) * 10 + index + 1}</TableCell>
                  <TableCell>{item.stateId?.name || "N/A"}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${item.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" title={item.isActive ? "Deactivate" : "Activate"} onClick={() => handleToggleStatus(item)}><Power className={`w-4 h-4 ${item.isActive ? "text-green-600" : "text-gray-400"}`} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Edit className="w-4 h-4 text-blue-600" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item._id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-4 mt-4">
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------
// PINCODE TAB
// ----------------------------------------------------
function PincodeTab() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/pincodes?search=${search}&page=${page}&limit=10`);
      const json = await res.json();
      if (json.success) {
         setData(json.data);
         if (json.pagination) setTotalPages(json.pagination.pages);
      }
    } catch (err) {
      toast.error("Failed to load pincodes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, page]);
  useEffect(() => { setPage(1); }, [search]);

  const handleEdit = async (item: any) => {
    const newPincode = window.prompt("Enter new PIN code", item.pincode);
    if (newPincode === null) return;
    if (!newPincode) return toast.error("PIN code is required");
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/pincodes/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pincode: newPincode })
      });
      const json = await res.json();
      if (json.success) { toast.success("PIN Code updated"); fetchData(); }
      else toast.error(json.message || "Failed to update PIN code");
    } catch (err: any) { toast.error(err.message || "Failed to update PIN code"); }
  };

  const handleToggleStatus = async (item: any) => {
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/pincodes/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive })
      });
      const json = await res.json();
      if (json.success) { toast.success(item.isActive ? "PIN Code deactivated" : "PIN Code activated"); fetchData(); }
      else toast.error(json.message || "Failed to update status");
    } catch (err: any) { toast.error(err.message || "Failed to update status"); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this PIN code?")) return;
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/pincodes/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) { toast.success("PIN Code deleted"); fetchData(); }
      else toast.error(json.message || "Failed to delete PIN code");
    } catch (err: any) { toast.error(err.message || "Failed to delete PIN code"); }
  };

  const handleToggleLocationStatus = async (pinId: string, loc: any) => {
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/pincodes/${pinId}/location/${loc._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !loc.isActive })
      });
      const json = await res.json();
      if (json.success) { toast.success(loc.isActive ? "Location deactivated" : "Location activated"); fetchData(); }
      else toast.error(json.message || "Failed to update location");
    } catch (err: any) { toast.error(err.message || "Failed to update location"); }
  };

  const handleDeleteLocation = async (pinId: string, locId: string) => {
    if (!window.confirm("Delete this location?")) return;
    try {
      const res = await secureAdminFetch(`${process.env.NEXT_PUBLIC_BASE_URL}/pincodes/${pinId}/location/${locId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) { toast.success("Location deleted"); fetchData(); }
      else toast.error(json.message || "Failed to delete location");
    } catch (err: any) { toast.error(err.message || "Failed to delete location"); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>PIN Codes & Locations</CardTitle>
          <CardDescription>Manage PIN Codes and embedded Locations</CardDescription>
        </div>
        <Button size="sm"><Plus className="w-4 h-4 mr-2" />Add PIN Code</Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Input 
            placeholder="Search PIN codes..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="max-w-sm"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">S.No.</TableHead>
              <TableHead>City</TableHead>
              <TableHead>PIN Code</TableHead>
              <TableHead>Locations</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10">Loading...</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10">No records found</TableCell></TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={item._id}>
                  <TableCell>{(page - 1) * 10 + index + 1}</TableCell>
                  <TableCell>{item.cityId?.name || "N/A"}</TableCell>
                  <TableCell className="font-medium">{item.pincode}</TableCell>
                  <TableCell>
                    {item.locations && item.locations.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {item.locations.map((loc: any) => (
                          <div key={loc._id} className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${loc.isActive ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                            <span>{loc.name}</span>
                            <button onClick={() => handleToggleLocationStatus(item._id, loc)} title={loc.isActive ? "Deactivate" : "Activate"} className={`ml-1 ${loc.isActive ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'}`}>
                              <Power size={12} />
                            </button>
                            <button onClick={() => handleDeleteLocation(item._id, loc._id)} title="Delete" className="text-gray-400 hover:text-red-600">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No locations</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${item.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" title={item.isActive ? "Deactivate" : "Activate"} onClick={() => handleToggleStatus(item)}><Power className={`w-4 h-4 ${item.isActive ? "text-green-600" : "text-gray-400"}`} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}><Edit className="w-4 h-4 text-blue-600" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item._id)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-end gap-4 mt-4">
            <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
