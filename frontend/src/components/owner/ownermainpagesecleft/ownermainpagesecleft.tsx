'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAppSelector } from '@/store/hooks';

// ---- QUERY from the house API slice ----
// If your houseApi slice exposes the hook under a different name, adjust here.
import { useGetHousesByOwnerBfalseQuery } from '@/store/api/houseApi';

import styles from './ownermainpagesecleft.module.css';
import { environment } from "@/environments/environments";

/* ============================================================
   Local UI config (was: class properties in Angular)
   ============================================================ */
const CATALOG_TITLE = 'List Houses for renting';
//const BASE_URL = process.env.NEXT_PUBLIC_ENDPOINT_I ?? '';
const BASE_URL = environment.endpointI;
const DEFAULT_HOUSE_IMAGE = '/images/mainownerpage/background.jpg';
const ITEMS_PER_PAGE = 10;

/* ============================================================
   Ownermainpagesecleft
   Left panel — catalog of owner's *available* (booked === false) houses.
   - Owner identity  : useAppSelector(state => state.user)
   - Data            : useGetHousesByOwnerBfalseQuery(ownerId)   [houseApi]
   ============================================================ */
export default function Ownermainpagesecleft() {
  /* ---------- Owner identity from the store ---------- */
  const owner:any = useAppSelector((state) => state.user);
  const ownerId: string = owner?.id ?? '';

  /* ---------- RTK Query: available houses (booked === false) ---------- */
  const {
    data: availableHouses = [],
    isLoading,
    isError,
  } = useGetHousesByOwnerBfalseQuery(ownerId, { skip: !ownerId });

  /* ---------- Search state (was: class properties) ---------- */
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<number>(100000);
  const [minRooms, setMinRooms] = useState<number>(0);

  /* ---------- Pagination ---------- */
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(ITEMS_PER_PAGE);

  /* ---------- Reset to page 1 whenever filters change ---------- */
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, maxPrice, minRooms]);

  /* ---------- Derived: filteredHouses (was: get filteredHouses) ---------- */
  const filteredHouses = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return availableHouses.filter((house: any) => {
      const matchesCity = (house.city ?? '').toLowerCase().includes(q);
      const matchesPrice = house.RentPrice <= maxPrice;
      const matchesRooms = house.totalRooms >= minRooms;
      return matchesCity && matchesPrice && matchesRooms;
    });
  }, [availableHouses, searchQuery, maxPrice, minRooms]);

  /* ---------- Derived: paginatedAvailableHouses ---------- */
  const paginatedAvailableHouses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredHouses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredHouses, currentPage, itemsPerPage]);

  /* ---------- Derived: totalPages (from filtered set, not raw set) ---------- */
  const totalPages = Math.max(
    1,
    Math.ceil(filteredHouses.length / itemsPerPage)
  );

  /* ---------- Handlers ---------- */
  const changePage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  /* ---------- Render ---------- */
  return (
    <section className={`${styles.flexColumnContainer} ${styles.catalogCardPanel}`}>
      {/* Search toolbar */}
      <div className={styles.searchToolbar}>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="City..."
          className={styles.searchInput}
        />
        <input
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          placeholder="Max Price"
          className={styles.searchInput}
        />
        <input
          type="number"
          value={minRooms}
          onChange={(e) => setMinRooms(Number(e.target.value))}
          placeholder="Min Rooms"
          className={styles.searchInput}
        />
      </div>
       
      <div className={styles.containerTitleBar}>
        <h2 style={{ textAlign: 'center' }}>{CATALOG_TITLE}</h2>
      </div>

      <div className={styles.scrollableCardsViewport}>
        {/* Loading state */}
        {isLoading && (
          <div className={styles.emptyStateFallback}>
            <p>Loading available houses…</p>
          </div>
        )}

        {/* Empty / error state — mirrors original `isEmptyState === false` intent */}
        {!isLoading && (isError || availableHouses.length === 0) && (
          <div className={styles.emptyStateFallback}>
            <p>No active Available Houses under your account parameters yet.</p>
          </div>
        )}

        {/* Cards grid */}
        {availableHouses.length > 0 && (
          <div className={styles.cardsResponsiveGrid}>
            {paginatedAvailableHouses.map((house: any) => {
              const imageSrc = house.image
                ? BASE_URL + house.image
                : DEFAULT_HOUSE_IMAGE;

              return (
                <article
                  key={house._id}
                  className={styles.propertyItemCard}
                >
                  <div className={styles.cardImageWrapper}>
                    <img
                      src={imageSrc}
                      alt="House Element Listing Snapshot Preview"
                      onError={(e) => {
                        // Mirrors Angular `(error)="house.image = null"`:
                        // swap to the fallback image on broken URLs.
                        const target = e.currentTarget;
                        if (target.src !== DEFAULT_HOUSE_IMAGE) {
                          target.src = DEFAULT_HOUSE_IMAGE;
                        }
                      }}
                    />
                    <span className={`${styles.badgeStatus} ${styles.statusVacant}`}>
                      Available
                    </span>
                  </div>

                  <div className={styles.cardBodyContent}>
                    <div className={styles.cardRowHeader}>
                      <h3 className={styles.houseIdentityCode}>{house.houseCode}</h3>
                      <span className={styles.rentPriceTag}>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(house.RentPrice)}
                        /mo
                      </span>
                    </div>

                    <p className={styles.locationGeography}>
                      {house.city}, {house.state}
                    </p>

                    <div className={styles.structuralAmenities}>
                      <span>
                        🏠 Total Rooms: <strong>{house.totalRooms}</strong>
                      </span>
                    </div>

                    <div className={styles.cardActionFooter}>
                      {/* "Rent a House" button was commented out in the Angular template — preserved as no-op. */}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination footer */}
      {totalPages > 1 && (
        <footer className={styles.paginationFooterWrapper}>
          <button
            className={styles.btnNavPage}
            disabled={currentPage === 1}
            onClick={() => changePage(currentPage - 1)}
          >
            Previous
          </button>
          <span className={styles.pageIndicatorCounter}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className={styles.btnNavPage}
            disabled={currentPage === totalPages}
            onClick={() => changePage(currentPage + 1)}
          >
            Next
          </button>
        </footer>
      )}
    </section>
  );
}