"use client";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/shared/icons";
import { useRouter } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Edit, RefreshCw, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useFolders } from "@/hooks/use-folders";

export const Header = ({
  projectId,
  generationId,
  onExport,
}: {
  projectId: string;
  generationId: string | null;
  onExport: () => void;
}) => {
  const [exporting, setExporting] = useState(false);
  const router = useRouter();
  const isMobile = useIsMobile();
  const { data: folders = [] } = useFolders();

  const handleRecreate = () => {
    // TODO: Implement recreate functionality
    console.log("Recreate clicked");
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    console.log("Edit clicked");
    router.push(`/edit/${generationId || projectId}`);
  };

  const handleDelete = () => {
    // TODO: Implement delete functionality
    console.log("Delete clicked");
  };

  const handlePublish = () => {
    // TODO: Implement publish functionality
    console.log("Publish clicked");
  };

  const handleMoveToFolder = (folderId: string | null) => {
    // TODO: Implement move to folder functionality
    console.log("Move to folder clicked", folderId);
  };

  return (
    <div className="h-14 flex items-center px-4 bg-card flex-none">
      <div className="flex items-center gap-2 flex-1">
        <Button
          className="rounded-full"
          size={"icon"}
          variant="ghost"
          onClick={() => router.back()}
        >
          <Icons.arrowLeft className="h-4 w-4" />
        </Button>
      </div>
      <span className="text-sm font-medium flex-1 text-center">A new video</span>
      <div className="flex items-center gap-2 flex-1 justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button className="rounded-full" size={"icon"} variant="outline">
              <Icons.moreHorizontal className="h-5 w-5 size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="space-y-1">
              <Button variant="ghost" className="w-full justify-start" onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <div className="flex items-center">
                      <Icons.folder className="mr-2 h-4 w-4" />
                      Move to folder
                    </div>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" side="right" align="start">
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleMoveToFolder(null)}
                    >
                      No folder
                    </Button>
                    {folders.map((folder) => (
                      <Button
                        key={folder.id}
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleMoveToFolder(folder.id)}
                      >
                        <Icons.folder className="mr-2 h-4 w-4" />
                        {folder.name}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="ghost" className="w-full justify-start" onClick={handleRecreate}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recreate
              </Button>
              {isMobile && (
                <>
                  <div className="border-t my-1" />
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      // setExporting(true);
                      onExport();
                    }}
                    disabled={exporting}
                  >
                    <Icons.download className="mr-2 h-4 w-4" />
                    {exporting ? "Rendering..." : "Render"}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive"
                    onClick={handleDelete}
                  >
                    <Icons.delete className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <Button variant="ghost" className="w-full justify-start" onClick={handlePublish}>
                    Publish
                  </Button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
        {!isMobile && (
          <>
            <Button className="rounded-full" size={"icon"} variant="ghost" onClick={handleDelete}>
              <Icons.delete className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => {
                // setExporting(true);
                onExport();
              }}
              className="rounded-full"
              disabled={exporting}
            >
              Download
            </Button>
            {/* <PublishPopover
                    open={publishOpen}
                    onOpenChange={setOpenPublish}
                    videoUrl={'https://cdn.scenify.io/test/vid1.mp4'}
                  >
                    <Button size="sm" className="rounded-full">
                      Publish
                    </Button>
                  </PublishPopover> */}
          </>
        )}
      </div>
    </div>
  );
};
