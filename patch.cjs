const fs = require('fs');

const path = 'src/components/shared/ShopSelector.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `      {/* Main Continuous Wrapper: Contains Hero + Shops Grid to avoid split dividers */}`;

const mobileLayout = `
      {/* ============================================================
          MOBILE LAYOUT
          ============================================================ */}
      <div className="mobile-home-container bg-white dark:bg-[#0b0f19]">
        {/* ---- Location Header ---- */}
        <div className="mobile-location-header pt-4">
          <MapPin size={18} className="text-black dark:text-white" />
          <span className="mobile-location-text text-black dark:text-white">Current location</span>
          <ChevronDown size={16} className="text-gray-500" />
        </div>

        {/* ---- Search Bar ---- */}
        <div className="mobile-search-section">
          <div className="mobile-search-bar bg-gray-50 dark:bg-[#131926]">
            <Search size={18} className="text-gray-400" />
            <input 
              type="text"
              placeholder="Browse all treatments"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mobile-search-placeholder bg-transparent border-none outline-none text-black dark:text-white w-full"
            />
            <button
              onClick={handleSearchSubmit}
              className="mobile-search-btn bg-black dark:bg-[#c5a059]"
            >
              Search
            </button>
          </div>
        </div>

        {/* ---- Category Icons ---- */}
        <MobileCategoryGrid
          categories={categories}
          activeCategory={selectedCategory}
          onCategorySelect={(id) => setSelectedCategory(id)}
        />

        {/* ---- Book Again ---- */}
        {trendingShops.length > 0 && (
          <section className="mobile-section">
            <h2 className="mobile-section-title dark:text-white">Book again</h2>
            <div className="mobile-book-again-list">
              {trendingShops.slice(0, 1).map((shop) => (
                <MobileShopBookAgainCard 
                  key={\`book-again-\${shop._id}\`} 
                  shop={shop} 
                  onClick={() => handleShopClick(shop)}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={favorites.includes(shop._id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ---- Favourites ---- */}
        {favorites.length > 0 && (
          <section className="mobile-section">
            <div className="mobile-section-header">
              <h2 className="mobile-section-title dark:text-white">Favourites</h2>
              <span className="mobile-see-all dark:text-gray-300">See all</span>
            </div>
            <div className="mobile-horizontal-scroll">
              {shops.filter(s => favorites.includes(s._id)).map((shop) => (
                <MobileShopListCard
                  key={\`fav-\${shop._id}\`}
                  shop={shop}
                  onClick={() => handleShopClick(shop)}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={true}
                />
              ))}
            </div>
          </section>
        )}

        {/* ---- Recommended ---- */}
        {recommendedShops.length > 0 && (
          <section className="mobile-section">
            <h2 className="mobile-section-title dark:text-white">Recommended</h2>
            <div className="mobile-horizontal-scroll">
              {recommendedShops.map((shop) => (
                <MobileShopListCard
                  key={\`rec-\${shop._id}\`}
                  shop={shop}
                  onClick={() => handleShopClick(shop)}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={favorites.includes(shop._id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ---- Recently Viewed ---- */}
        {trendingShops.length > 0 && (
          <section className="mobile-section">
            <h2 className="mobile-section-title dark:text-white">Recently viewed</h2>
            <div className="mobile-horizontal-scroll">
              {trendingShops.map((shop) => (
                <MobileShopListCard
                  key={\`viewed-\${shop._id}\`}
                  shop={shop}
                  onClick={() => handleShopClick(shop)}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={favorites.includes(shop._id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ---- New to Vijayajalakam ---- */}
        {newShops.length > 0 && (
          <section className="mobile-section mobile-section-last">
            <h2 className="mobile-section-title dark:text-white">New to Vijayajalakam</h2>
            <div className="mobile-horizontal-scroll">
              {newShops.map((shop) => (
                <MobileShopListCard
                  key={\`new-\${shop._id}\`}
                  shop={shop}
                  onClick={() => handleShopClick(shop)}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={favorites.includes(shop._id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Mobile Bottom Navigation Component - Simplified version for global page */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#121824] border-t border-gray-100 dark:border-white/5 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
            <div className="flex justify-around items-center h-14 px-2">
                <div className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 transition-all duration-200 text-black dark:text-[#c5a059]">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    <span className="text-[10px] font-semibold transition-colors duration-200">Home</span>
                </div>
                <div onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  document.querySelector('.mobile-search-placeholder')?.focus();
                }} className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 transition-all duration-200 text-gray-400 dark:text-gray-500 cursor-pointer">
                    <Search size={22} strokeWidth={1.8} />
                    <span className="text-[10px] font-medium transition-colors duration-200">Search</span>
                </div>
                <Link to="/login" className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 transition-all duration-200 text-gray-400 dark:text-gray-500">
                    <Calendar size={22} strokeWidth={1.8} />
                    <span className="text-[10px] font-medium transition-colors duration-200">Bookings</span>
                </Link>
                <Link to={user ? "/login" : "/login"} className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-4 transition-all duration-200 text-gray-400 dark:text-gray-500">
                    <User size={22} strokeWidth={1.8} />
                    <span className="text-[10px] font-medium transition-colors duration-200">Profile</span>
                </Link>
            </div>
            <div className="h-[env(safe-area-inset-bottom,0px)]" />
        </div>
      </div>
      
      <div className="desktop-home-container">
`;

// Wrap the main continuous wrapper in desktop-home-container
if (!content.includes('className="mobile-home-container bg-white')) {
  content = content.replace(targetStr, mobileLayout + targetStr);

  // We need to close the div before "Download the Vijayajalakam App Section"
  const endTargetStr = `      {/* Download the Vijayajalakam App Section */}`;
  content = content.replace(endTargetStr, `      </div>\n\n` + endTargetStr);

  fs.writeFileSync(path, content, 'utf8');
  console.log("Successfully patched ShopSelector.jsx");
} else {
  console.log("Already patched.");
}
