import { useEffect, useState } from 'react';
import { Check } from '@phosphor-icons/react';
import { CATEGORIES } from '../../data/libraryData';
import { useLibraryStore } from '../../store/libraryStore';
import { useToast } from '../Toast';
import type { Book, BookCategory } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  book?: Book;
  onClose: () => void;
}

export default function BookFormModal({ book, onClose }: Props) {
  const isEdit = !!book;
  const addBook = useLibraryStore((s) => s.addBook);
  const updateBook = useLibraryStore((s) => s.updateBook);
  const { showToast } = useToast();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const [title, setTitle] = useState(book?.title ?? '');
  const [author, setAuthor] = useState(book?.author ?? '');
  const [isbn, setIsbn] = useState(book?.isbn ?? '');
  const [category, setCategory] = useState<BookCategory>(book?.category ?? CATEGORIES[0]);
  const [totalCopies, setTotalCopies] = useState(String(book?.totalCopies ?? 5));
  const [rack, setRack] = useState(book?.rack ?? '');
  const [touched, setTouched] = useState(false);

  const copiesNum = Number(totalCopies);
  const errors = {
    title: !title.trim(),
    author: !author.trim(),
    isbn: !isbn.trim(),
    rack: !rack.trim(),
    totalCopies: !Number.isInteger(copiesNum) || copiesNum < 1,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  async function submit() {
    setTouched(true);
    if (hasErrors) return;
    const payload = {
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim(),
      category,
      totalCopies: copiesNum,
      rack: rack.trim(),
      addedDate: book?.addedDate ?? new Date().toISOString().slice(0, 10),
    };
    try {
      if (isEdit && book) {
        await updateBook(book.id, payload);
        showToast('Book updated', 'success');
      } else {
        await addBook(payload);
        showToast('Book added to catalog', 'success');
      }
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to FloppyDisk book. Please try again.', 'error');
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Book' : 'Add New Book'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the catalog entry' : 'Add a new title to the library catalog'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="book-title" className="text-xs font-medium">Title *</Label>
            <Input
              id="book-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Algebra and Trigonometry"
            />
            {touched && errors.title && (
              <p className="text-xs text-destructive">Title is required</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="book-author" className="text-xs font-medium">Author *</Label>
              <Input
                id="book-author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Michael Sullivan"
              />
              {touched && errors.author && (
                <p className="text-xs text-destructive">Author is required</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="book-isbn" className="text-xs font-medium">ISBN *</Label>
              <Input
                id="book-isbn"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="978-0-00-000000-0"
              />
              {touched && errors.isbn && (
                <p className="text-xs text-destructive">ISBN is required</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="book-cat" className="text-xs font-medium">Category</Label>
              <NativeSelect
                id="book-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value as BookCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="book-copies" className="text-xs font-medium">Total Copies *</Label>
              <Input
                id="book-copies"
                type="number"
                min={1}
                value={totalCopies}
                onChange={(e) => setTotalCopies(e.target.value)}
              />
              {touched && errors.totalCopies && (
                <p className="text-xs text-destructive">Enter at least 1 copy</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="book-rack" className="text-xs font-medium">Rack / Shelf Location *</Label>
            <Input
              id="book-rack"
              value={rack}
              onChange={(e) => setRack(e.target.value)}
              placeholder="e.g. S-06"
            />
            {touched && errors.rack && (
              <p className="text-xs text-destructive">Rack location is required</p>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>
            <Check size={14} className="mr-1.5" /> {isEdit ? 'Save Changes' : 'Add Book'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
