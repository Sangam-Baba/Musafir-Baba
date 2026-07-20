"use client";

import React, { useMemo } from "react";
import { UseFormReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import ImageUploader from "@/components/admin/ImageUploader";
import { resolveSocialMetadata } from "@/lib/seo/social/resolveSocialMetadata";
import { getPreviewModel } from "@/lib/seo/social/previewModel";
import { ModuleType, ResolvedMetadataInput } from "@/lib/seo/social/types";
import { AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OpenGraphManagerProps {
  form: UseFormReturn<any>;
  baseMetadata: ResolvedMetadataInput;
  moduleType: ModuleType;
}

export default function OpenGraphManager({ form, baseMetadata, moduleType }: OpenGraphManagerProps) {
  const watchSocial = form.watch("social");

  const resolved = useMemo(() => {
    return resolveSocialMetadata({
      resolvedMetadata: baseMetadata,
      socialOverrides: watchSocial,
      moduleType,
    });
  }, [baseMetadata, watchSocial, moduleType]);

  const preview = useMemo(() => getPreviewModel(resolved), [resolved]);

  const resetField = (path: string) => {
    form.setValue(path, undefined, { shouldDirty: true, shouldTouch: true });
  };

  return (
    <div className="space-y-8 bg-gray-50/50 dark:bg-gray-900/50 p-6 rounded-xl border">
      {/* Validation Status */}
      <div className={`p-4 rounded-lg flex items-start gap-3 border ${resolved.validation.status === 'Ready' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30' : 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950/30'}`}>
        {resolved.validation.status === 'Ready' ? <CheckCircle2 className="w-5 h-5 mt-0.5" /> : <AlertCircle className="w-5 h-5 mt-0.5" />}
        <div>
          <h4 className="font-medium text-sm">Social Status: {resolved.validation.status}</h4>
          {resolved.validation.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
              {resolved.validation.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Tabs defaultValue="og">
        <TabsList className="mb-4">
          <TabsTrigger value="og">Open Graph (Facebook/LinkedIn)</TabsTrigger>
          <TabsTrigger value="twitter">Twitter (X)</TabsTrigger>
          <TabsTrigger value="preview">Live Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="og" className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>OG Title <span className="text-xs text-muted-foreground ml-2 font-normal">({watchSocial?.openGraph?.title?.length || 0}/60 recommended)</span></Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => resetField('social.openGraph.title')} className="h-6 px-2 text-xs text-muted-foreground"><RotateCcw className="w-3 h-3 mr-1"/> Reset to Automatic</Button>
            </div>
            <Input 
              {...form.register("social.openGraph.title")} 
              placeholder="Leave blank to use automatic value" 
              className={resolved.sources.openGraph.title.status === 'Automatic' ? 'border-dashed' : 'border-solid border-blue-500'}
            />
            <p className="text-xs text-muted-foreground">Using: <strong>{resolved.openGraph.title}</strong> (Source: {resolved.sources.openGraph.title.source})</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>OG Description <span className="text-xs text-muted-foreground ml-2 font-normal">({watchSocial?.openGraph?.description?.length || 0}/160 recommended)</span></Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => resetField('social.openGraph.description')} className="h-6 px-2 text-xs text-muted-foreground"><RotateCcw className="w-3 h-3 mr-1"/> Reset to Automatic</Button>
            </div>
            <Textarea 
              {...form.register("social.openGraph.description")} 
              placeholder="Leave blank to use automatic value" 
              className={resolved.sources.openGraph.description.status === 'Automatic' ? 'border-dashed' : 'border-solid border-blue-500'}
            />
            <p className="text-xs text-muted-foreground">Using: <strong>{resolved.openGraph.description}</strong> (Source: {resolved.sources.openGraph.description.source})</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>OG Image</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => resetField('social.openGraph.image')} className="h-6 px-2 text-xs text-muted-foreground"><RotateCcw className="w-3 h-3 mr-1"/> Reset to Automatic</Button>
            </div>
            <div className={`p-4 rounded-lg border ${resolved.sources.openGraph.image.status === 'Automatic' ? 'border-dashed bg-gray-50 dark:bg-gray-900/50' : 'border-solid border-blue-500 bg-blue-50/30'}`}>
              <div className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Recommended: 1200x630px, JPG/PNG, Max 50kb
              </div>
              <ImageUploader
                className="w-full max-w-md aspect-video"
                onChange={(urls) => {
                  form.setValue("social.openGraph.image", urls?.url || "", { shouldDirty: true, shouldTouch: true });
                }}
                initialImage={watchSocial?.openGraph?.image ? { url: watchSocial.openGraph.image } : undefined}
              />
              <p className="text-xs text-muted-foreground mt-2">Currently resolving to: <strong>{resolved.openGraph.images}</strong> (Source: {resolved.sources.openGraph.image.source})</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="twitter" className="space-y-6">
          <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 p-4 rounded-lg border">
            <Checkbox 
              id="twitterInherit"
              checked={watchSocial?.twitter?.inheritOpenGraph ?? true}
              onCheckedChange={(checked) => {
                form.setValue("social.twitter.inheritOpenGraph", checked, { shouldDirty: true });
              }}
            />
            <Label htmlFor="twitterInherit" className="font-medium">Inherit Open Graph Metadata</Label>
          </div>

          {!(watchSocial?.twitter?.inheritOpenGraph ?? true) && (
            <div className="space-y-6 pt-4 border-t">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Twitter Title <span className="text-xs text-muted-foreground ml-2 font-normal">({watchSocial?.twitter?.title?.length || 0}/70 recommended)</span></Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => resetField('social.twitter.title')} className="h-6 px-2 text-xs text-muted-foreground"><RotateCcw className="w-3 h-3 mr-1"/> Reset to Automatic</Button>
                </div>
                <Input {...form.register("social.twitter.title")} placeholder="Leave blank to use automatic value" />
                <p className="text-xs text-muted-foreground">Source: {resolved.sources.twitter.title.source}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Twitter Description <span className="text-xs text-muted-foreground ml-2 font-normal">({watchSocial?.twitter?.description?.length || 0}/200 recommended)</span></Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => resetField('social.twitter.description')} className="h-6 px-2 text-xs text-muted-foreground"><RotateCcw className="w-3 h-3 mr-1"/> Reset to Automatic</Button>
                </div>
                <Textarea {...form.register("social.twitter.description")} placeholder="Leave blank to use automatic value" />
                <p className="text-xs text-muted-foreground">Source: {resolved.sources.twitter.description.source}</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6 justify-center">
            {/* Facebook Preview */}
            <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-950 shadow-sm w-full max-w-sm">
              <div className="bg-gray-100 dark:bg-gray-900 p-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Facebook Preview</div>
              <div className="aspect-[1.91/1] w-full bg-gray-200">
                {preview.facebook.image && <img src={preview.facebook.image} alt="Preview" className="w-full h-full object-cover" />}
              </div>
              <div className="p-4 bg-[#F2F3F5] dark:bg-[#1E1E1E]">
                <div className="text-[12px] text-gray-500 dark:text-gray-400 uppercase">{preview.facebook.siteName}</div>
                <div className="font-semibold text-[16px] text-[#1D2129] dark:text-gray-100 truncate mt-1">{preview.facebook.title}</div>
                <div className="text-[14px] text-[#606770] dark:text-gray-400 line-clamp-1 mt-1">{preview.facebook.description}</div>
              </div>
            </div>

            {/* Twitter Preview */}
            <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-950 shadow-sm w-full max-w-sm">
              <div className="bg-gray-100 dark:bg-gray-900 p-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">X (Twitter) Preview</div>
              <div className="aspect-[1.91/1] w-full bg-gray-200">
                {preview.twitter.image && <img src={preview.twitter.image} alt="Preview" className="w-full h-full object-cover border-b" />}
              </div>
              <div className="p-3">
                <div className="font-normal text-[15px] text-[#0F1419] dark:text-gray-100 truncate">{preview.twitter.title}</div>
                <div className="text-[15px] text-[#536471] dark:text-gray-400 line-clamp-2 mt-0.5">{preview.twitter.description}</div>
                <div className="text-[15px] text-[#536471] dark:text-gray-400 flex items-center mt-1">
                  <LinkIcon className="w-4 h-4 mr-1"/> musafirbaba.com
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LinkIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
  );
}
