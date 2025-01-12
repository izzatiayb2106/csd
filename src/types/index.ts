export interface UserLogIn{
    email: string,
    password: string;
}

export interface UserSignIn{
    email: string; 
    password: string; 
    confirmPassword: string;
}

export interface Proposal {
    title: string;
    description: string;
    documents: DocumentMeta[];
    status: 'pending' | 'accepted' | 'rejected';
    userId: string | null;
    date: Date;
}

export interface DocumentMeta {
    cdnUrl: string;
    uuid: string;
}

export interface FileEntry {
    files: Array<{
        cdnUrl: string;
        uuid: string;
        name?: string;
    }>;
}