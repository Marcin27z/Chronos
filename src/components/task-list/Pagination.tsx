import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaginationDTO } from "@/types";

interface PaginationProps {
  pagination: PaginationDTO;
  currentPage: number;
  onPageChange: (page: number) => void;
}

/**
 * Pagination component
 * Kontrolki paginacji z informacją o aktualnej stronie
 */
export function Pagination({ pagination, currentPage, onPageChange }: PaginationProps) {
  const { total, limit, offset } = pagination;
  const totalPages = Math.ceil(total / limit);
  const rangeStart = offset + 1;
  const rangeEnd = Math.min(offset + limit, total);

  return (
    <div className="flex items-center justify-between">
      <Button variant="outline" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
        <ChevronLeft className="h-4 w-4 mr-2" />
        Poprzednia
      </Button>

      <span className="text-sm text-muted-foreground">
        Strona {currentPage} z {totalPages}
        {" • "}
        Wyświetlono {rangeStart}-{rangeEnd} z {total}
      </span>

      <Button variant="outline" onClick={() => onPageChange(currentPage + 1)} disabled={!pagination.has_more}>
        Następna
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
}
