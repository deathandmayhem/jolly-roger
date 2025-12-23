import { faStar as faStarRegular } from "@fortawesome/free-regular-svg-icons/faStar";
import { faStar as faStarSolid } from "@fortawesome/free-solid-svg-icons/faStar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useCallback, useState } from "react";
import Button from "react-bootstrap/Button";
import bookmarkPuzzle from "../../methods/bookmarkPuzzle";

interface BookmarkButtonProps<As extends React.ElementType = React.ElementType>
  extends React.HTMLAttributes<HTMLElement> {
  puzzleId: string;
  bookmarked: boolean;
  as?: As;
}

type BookmarkButtonType = <As extends React.ElementType = typeof Button>(
  props: BookmarkButtonProps<As> &
    Omit<React.ComponentPropsWithRef<As>, keyof BookmarkButtonProps>,
  context?: any,
) => React.ReactNode;

const BookmarkButton: BookmarkButtonType = React.forwardRef<
  HTMLElement,
  BookmarkButtonProps
>(({ puzzleId, bookmarked, as: Component = Button, ...props }, ref) => {
  const bookmarkText = bookmarked ? "Unbookmark puzzle" : "Bookmark puzzle";

  const [animateBookmark, setAnimateBookmark] = useState(false);
  const onAnimationEnd = useCallback(() => {
    setAnimateBookmark(false);
  }, []);
  const toggleBookmark = useCallback(() => {
    void (async () => {
      await bookmarkPuzzle.callPromise({ puzzleId, bookmark: !bookmarked });
      setAnimateBookmark(true);
    })();
  }, [puzzleId, bookmarked]);

  return (
    <Component
      ref={ref}
      onClick={toggleBookmark}
      title={bookmarkText}
      {...props}
    >
      <FontAwesomeIcon
        icon={bookmarked ? faStarSolid : faStarRegular}
        beat={animateBookmark}
        onAnimationEnd={onAnimationEnd}
        style={{
          "--fa-animation-iteration-count": "1",
          "--fa-animation-duration": "0.2s",
        }}
      />
    </Component>
  );
});

export default BookmarkButton;
