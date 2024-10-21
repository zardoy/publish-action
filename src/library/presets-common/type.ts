// Types of presets exports

import { Octokit } from '@octokit/rest'
import { PackageJson } from 'type-fest'
import { NextVersionReturn as NextVersionResult } from '../bumpVersion'
import { Config, GlobalPreset, PresetSpecificConfigs } from '../config'

export type InputData<T extends GlobalPreset> = {
    doPublish: boolean
    repo: {
        url: string
        octokit: Record<'repo' | 'owner', string>
    }
    octokit: Octokit
    newVersion: string
    versionBumpInfo: NextVersionResult | undefined
    preRelease: boolean
    presetConfig: PresetSpecificConfigs[T]
    changelog?: string
}

export type OutputData = {
    assets?: Array<{ name: string; path: string }>
    postRun?: (octokit: Octokit, packageJson: PackageJson) => any
    jsonFilesFieldsToRemove?: {
        [relativePath: string]: Set<string>
    }
}

export type PresetMain<T extends GlobalPreset> = (data: InputData<T>) => Promise<void | OutputData>

type BeforeSharedActionsChange = {
    noPublish?: boolean
}

type MaybePromise<T> = T | Promise<T>

export type PresetExports = { main: PresetMain<any>; beforeSharedActions?: (config: Config) => MaybePromise<void | BeforeSharedActionsChange> }
