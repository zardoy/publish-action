declare namespace NodeJS {
    interface ProcessEnv {
        GITHUB_TOKEN: string
        GITHUB_REPOSITORY: string
        GITHUB_REF?: string
        CI?: string
    }
}
