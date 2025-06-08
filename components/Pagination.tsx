
import React from 'react';
import { PaginationProps } from '../types';

const Pagination: React.FC<PaginationProps> = ({
  totalItems, itemsPerPage, currentPage, onPageChange, maxPageButtons = 5,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) onPageChange(page);
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const ellipsis = <button className="btn btn-sm btn-disabled pointer-events-none">...</button>; // DaisyUI styled ellipsis

    if (totalPages <= maxPageButtons) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(
          <button key={i} onClick={() => handlePageClick(i)} className={`btn btn-sm ${currentPage === i ? 'btn-primary' : 'btn-ghost'}`} aria-current={currentPage === i ? 'page' : undefined} aria-label={`Go to page ${i}`}>
            {i}
          </button>
        );
      }
    } else {
      const numMiddlePagesToShow = Math.max(1, maxPageButtons - 2); // Ensure at least 1 middle page if maxPageButtons allows
      let middleStart = Math.max(2, currentPage - Math.floor((numMiddlePagesToShow -1) / 2));
      let middleEnd = Math.min(totalPages - 1, middleStart + numMiddlePagesToShow - 1);
      
      if (middleEnd - middleStart + 1 < numMiddlePagesToShow) {
        if (currentPage < totalPages / 2) middleEnd = Math.min(totalPages - 1, middleStart + numMiddlePagesToShow - 1);
        else middleStart = Math.max(2, middleEnd - numMiddlePagesToShow + 1);
      }

      // First page
      pageNumbers.push(<button key={1} onClick={() => handlePageClick(1)} className={`btn btn-sm ${currentPage === 1 ? 'btn-primary' : 'btn-ghost'}`}>{1}</button>);

      // Ellipsis after first page
      if (middleStart > 2) pageNumbers.push(React.cloneElement(ellipsis, { key: "start-ellipsis" }));
      
      // Middle pages
      for (let i = middleStart; i <= middleEnd; i++) {
        if (i !== 1 && i !== totalPages) { // Don't repeat first/last if they fall into middle range
             pageNumbers.push(<button key={i} onClick={() => handlePageClick(i)} className={`btn btn-sm ${currentPage === i ? 'btn-primary' : 'btn-ghost'}`} aria-current={currentPage === i ? 'page' : undefined}>{i}</button>);
        }
      }

      // Ellipsis before last page
      if (middleEnd < totalPages - 1) pageNumbers.push(React.cloneElement(ellipsis, { key: "end-ellipsis" }));
      
      // Last page
      pageNumbers.push(<button key={totalPages} onClick={() => handlePageClick(totalPages)} className={`btn btn-sm ${currentPage === totalPages ? 'btn-primary' : 'btn-ghost'}`}>{totalPages}</button>);
    }
    return pageNumbers;
  };

  return (
    <nav className="mt-6 mb-3 flex justify-center" aria-label="Pagination">
      <div className="join"> {/* Use join for grouped buttons */}
        <button onClick={() => handlePageClick(currentPage - 1)} className="join-item btn btn-sm btn-outline" disabled={currentPage === 1} aria-label="Previous page">
          <i className="fas fa-chevron-left fa-xs"></i><span className="hidden sm:inline ml-1">Prev</span>
        </button>
        {renderPageNumbers().map((pageBtn, index) => (
            React.cloneElement(pageBtn, {className: `${pageBtn.props.className} join-item`})
        ))}
        <button onClick={() => handlePageClick(currentPage + 1)} className="join-item btn btn-sm btn-outline" disabled={currentPage === totalPages} aria-label="Next page">
          <span className="hidden sm:inline mr-1">Next</span><i className="fas fa-chevron-right fa-xs"></i>
        </button>
      </div>
    </nav>
  );
};

export default Pagination;