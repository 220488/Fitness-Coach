"use client";

import { equipmentIcon } from "@/components/EquipmentIcon";
import photos from "@/data/equipment-photos.json";

/**
 * A photograph of the equipment, shown in the exercise detail view.
 *
 * Images come from Wikimedia Commons via scripts/fetch-equipment-photos.mjs and
 * are committed, so nothing is hotlinked and the page does not depend on Commons
 * being up. Most are CC-licensed and legally require visible credit, which is
 * why `needsCredit` is carried through the manifest and rendered here rather
 * than left to the caller to remember.
 */

interface PhotoMeta {
  src: string;
  title: string;
  author: string;
  licence: string;
  licenceUrl: string | null;
  source: string;
  needsCredit: boolean;
}

const PHOTOS = photos as unknown as Record<string, PhotoMeta>;

export function EquipmentPhoto({ equipment }: { equipment: string }) {
  const key = equipmentIcon(equipment);
  const photo = key ? PHOTOS[key] : undefined;
  if (!photo) return null;

  return (
    <figure className="kitPhoto">
      {/* Plain <img>: these are committed static files, and next/image would
          add build-time processing for no benefit at this size. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.src} alt={equipment} loading="lazy" width={720} height={430} />
      {photo.needsCredit && (
        <figcaption>
          <a href={photo.source} target="_blank" rel="noopener noreferrer">
            {photo.title.replace(/\.[a-z0-9]+$/i, "")}
          </a>{" "}
          by {photo.author} ·{" "}
          {photo.licenceUrl ? (
            <a href={photo.licenceUrl} target="_blank" rel="noopener noreferrer">
              {photo.licence}
            </a>
          ) : (
            photo.licence
          )}
        </figcaption>
      )}
    </figure>
  );
}
