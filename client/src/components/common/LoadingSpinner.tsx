export default function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center p-12">
      <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  );
}
