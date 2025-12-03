import Component from '@glimmer/component';
import libraryImageUrl from 'photo-filter-frontend/utils/library-image-url';

interface PersonTileArgs {
  person: {
    displayName?: string | null;
    name?: string | null;
    photoCount?: number | null;
    earliestPhotoAt?: string | Date | null;
    latestPhotoAt?: string | Date | null;
    medianPhotoAt?: string | Date | null;
    heroExportedName?: string | null;
    earliestExportedName?: string | null;
    medianExportedName?: string | null;
    latestExportedName?: string | null;
    highlightExportedName?: string | null;
  } | null;
  sort?: string;
}

export default class PeoplePersonTileComponent extends Component<PersonTileArgs> {
  get person() {
    return this.args.person;
  }

  get sort() {
    return this.args.sort ?? 'medianPhotoAt';
  }

  get displayName() {
    return (
      this.person?.displayName || this.person?.name || 'Unnamed person'
    );
  }

  get heroFilename(): string | null {
    if (!this.person) {
      return null;
    }

    if (this.person.heroExportedName) {
      return this.person.heroExportedName;
    }

    if (this.sort === 'earliestPhotoAt') {
      return (
        this.person.earliestExportedName ?? this.person.heroExportedName ?? null
      );
    }

    if (this.sort === 'latestPhotoAt') {
      return this.person.latestExportedName ?? this.person.heroExportedName ?? null;
    }

    if (this.sort === 'photoCount' || this.sort === 'name') {
      return (
        this.person.highlightExportedName ?? this.person.heroExportedName ?? null
      );
    }

    return this.person.medianExportedName ?? this.person.heroExportedName ?? null;
  }

  get heroUrl(): string | null {
    const filename = this.heroFilename;
    return filename ? libraryImageUrl(filename) : null;
  }

  get primaryDateLabel() {
    if (this.sort === 'earliestPhotoAt') {
      return 'Earliest';
    }

    if (this.sort === 'latestPhotoAt') {
      return 'Latest';
    }

    return 'Median';
  }

  get primaryDateValue() {
    if (!this.person) {
      return null;
    }

    if (this.sort === 'earliestPhotoAt') {
      return this.person.earliestPhotoAt;
    }

    if (this.sort === 'latestPhotoAt') {
      return this.person.latestPhotoAt;
    }

    return this.person.medianPhotoAt;
  }
}
