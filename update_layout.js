const fs = require('fs');

const file = 'src/features/appointments/pages/ServicesManager.jsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `          <CustomTextField
            ref={nameRef}
            label="Service Name"
            icon={Scissors}
            placeholder="e.g. Haircut"
            value={newService.name}
            onChange={(e) =>
              setNewService({ ...newService, name: e.target.value })
            }
            onKeyDown={(e) => {
              const firstDept = departments[0]?._id;
              handleKeyDown(e, firstDept);
            }}
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-widest pl-1 block">Description</label>
            <textarea
              placeholder="e.g. A classic haircut with a wash and blowdry..."
              value={newService.description}
              onChange={(e) => setNewService({ ...newService, description: e.target.value })}
              className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all placeholder:text-gray-400 disabled:opacity-50 min-h-[80px] resize-y"
            />
          </div>
          {branches.length > 0 && (
            <CustomMultiSelect
              label={
                <>
                  Assign Branches <span className="text-red-500">*</span>
                </>
              }
              icon={Store}
              placeholder="Select Branches"
              value={newService.branches}
              onChange={(e) =>
                setNewService({ ...newService, branches: e.target.value })
              }
              options={branches
                .filter((b) => {
                  if (user?.role === "staff") {
                    const uBranchId =
                      typeof user.branchId === "string"
                        ? user.branchId
                        : user.branchId?._id;
                    return b._id === uBranchId;
                  }
                  return true;
                })
                .map((b) => ({
                  value: b._id,
                  label: b.name,
                  description: b.mapAddress || b.address,
                }))}
              isSearchable={true}
              showSelectAll={user?.role !== "staff"}
            />
          )}

          <CustomMultiSelect
            label={<span className="inline-flex items-center gap-1.5"><span>Categories</span><button type="button" onClick={() => setIsAddCategoryOpen(true)} className="flex items-center justify-center w-5 h-5 rounded-md bg-brand-primary/10 text-brand-primary dark:text-blue-400 hover:bg-brand-primary hover:text-white transition-all shadow-sm" title="Add New Category"><Plus size={12} strokeWidth={3} /></button></span>}
            icon={Layers}
            value={newService.categories}
            onChange={(e) => setNewService({ ...newService, categories: e.target.value })}
            options={categories.map((c) => ({ value: c._id, label: c.name }))}
            placeholder="Select Categories"
            isSearchable
          />`;

const replace1 = `            {/* Row 1: Photo and Details */}
            <div className="flex flex-col md:flex-row gap-5">
              {/* Left Column: Image Upload */}
              <div className="md:w-1/3 flex flex-col gap-2">
                 <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                      Service Photo
                    </label>
                    {canGenerateImage && (
                      <button
                        type="button"
                        disabled={!newService.name}
                        onClick={() => setIsImageGenerationModalOpen(true)}
                        className={\`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all \${newService.name ? "text-brand-primary dark:text-blue-400 hover:text-brand-secondary cursor-pointer" : "text-gray-300 cursor-not-allowed"}\`}
                      >
                        <Sparkles size={12} />
                        Auto Generate
                      </button>
                    )}
                 </div>
                 <div className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl h-full min-h-[160px] gap-3">
                    <div className="w-20 h-20 rounded-2xl bg-white dark:bg-dark-surface border-2 border-dashed border-gray-200 dark:border-dark-border overflow-hidden flex items-center justify-center shrink-0">
                      {isGenerating ? (
                        <Loader2 size={24} className="text-brand-primary dark:text-blue-400 animate-spin" />
                      ) : imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={24} className="text-gray-300" />
                      )}
                    </div>
                    <div className="flex flex-col items-center gap-1.5 text-center w-full overflow-hidden">
                      <input type="file" accept="image/*" onChange={handleImageChange} className="w-full max-w-[160px] text-[10px] text-gray-500 dark:text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 dark:bg-blue-900/20 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                      <p className="text-[9px] text-brand-primary dark:text-blue-400 font-bold uppercase tracking-widest">{getFileSizeHint()}</p>
                    </div>
                 </div>
              </div>

              {/* Right Column: Name & Description */}
              <div className="md:w-2/3 flex flex-col gap-5">
                <CustomTextField
                  ref={nameRef}
                  label="Service Name"
                  icon={Scissors}
                  placeholder="e.g. Haircut"
                  value={newService.name}
                  onChange={(e) =>
                    setNewService({ ...newService, name: e.target.value })
                  }
                  onKeyDown={(e) => {
                    const firstDept = departments[0]?._id;
                    handleKeyDown(e, firstDept);
                  }}
                  required
                />
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 tracking-widest pl-1 block">Description</label>
                  <textarea
                    placeholder="e.g. A classic haircut with a wash and blowdry..."
                    value={newService.description}
                    onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                    className="w-full h-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all placeholder:text-gray-400 disabled:opacity-50 min-h-[80px] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Branches & Categories */}
            <div className="flex flex-col md:flex-row gap-5">
              <div className="flex-1 min-w-0">
                {branches.length > 0 && (
                  <CustomMultiSelect
                    label={
                      <>
                        Assign Branches <span className="text-red-500">*</span>
                      </>
                    }
                    icon={Store}
                    placeholder="Select Branches"
                    value={newService.branches}
                    onChange={(e) =>
                      setNewService({ ...newService, branches: e.target.value })
                    }
                    options={branches
                      .filter((b) => {
                        if (user?.role === "staff") {
                          const uBranchId =
                            typeof user.branchId === "string"
                              ? user.branchId
                              : user.branchId?._id;
                          return b._id === uBranchId;
                        }
                        return true;
                      })
                      .map((b) => ({
                        value: b._id,
                        label: b.name,
                        description: b.mapAddress || b.address,
                      }))}
                    isSearchable={true}
                    showSelectAll={user?.role !== "staff"}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <CustomMultiSelect
                  label={<span className="inline-flex items-center gap-1.5"><span>Categories</span><button type="button" onClick={() => setIsAddCategoryOpen(true)} className="flex items-center justify-center w-5 h-5 rounded-md bg-brand-primary/10 text-brand-primary dark:text-blue-400 hover:bg-brand-primary hover:text-white transition-all shadow-sm" title="Add New Category"><Plus size={12} strokeWidth={3} /></button></span>}
                  icon={Layers}
                  value={newService.categories}
                  onChange={(e) => setNewService({ ...newService, categories: e.target.value })}
                  options={categories.map((c) => ({ value: c._id, label: c.name }))}
                  placeholder="Select Categories"
                  isSearchable
                />
              </div>
            </div>`;

const target2 = `          {/* Photo inside General tab */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
                Service Photo
              </label>
              {canGenerateImage && (
                <button
                  type="button"
                  disabled={!newService.name}
                  onClick={() => setIsImageGenerationModalOpen(true)}
                  className={\`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all \${newService.name ? "text-brand-primary dark:text-blue-400 hover:text-brand-secondary cursor-pointer" : "text-gray-300 cursor-not-allowed"}\`}
                >
                  <Sparkles size={12} />
                  Auto Generate
                </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-dark-card border-2 border-dashed border-gray-200 dark:border-dark-border overflow-hidden flex items-center justify-center">
                {isGenerating ? (
                  <Loader2 size={24} className="text-brand-primary dark:text-blue-400 animate-spin" />
                ) : imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera size={24} className="text-gray-300" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input type="file" accept="image/*" onChange={handleImageChange}
                  className="text-xs text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:bg-blue-900/20 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                <p className="text-[10px] text-brand-primary dark:text-blue-400 font-bold ml-1 uppercase tracking-tight">{getFileSizeHint()}</p>
              </div>
            </div>
          </div>`;

if (!content.includes(target1)) {
  console.log("Error: Target 1 not found");
  process.exit(1);
}

if (!content.includes(target2)) {
  console.log("Error: Target 2 not found");
  process.exit(1);
}

content = content.replace(target1, replace1);
content = content.replace(target2, "");

fs.writeFileSync(file, content);
console.log("Success");
