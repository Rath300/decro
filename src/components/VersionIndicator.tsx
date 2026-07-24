import versionInfo from '../../version.json'

// The version used to be fetched from /api/version, which read version.json off
// disk at request time and fell back to a hardcoded 'alpha 0.01' whenever that
// read failed — so the badge could disagree with the file. Importing the JSON
// inlines it at build time and leaves version.json as the single source.

export default function VersionIndicator() {
  return (
    <div className="fixed bottom-4 right-4 text-xs font-['Space_Mono'] text-gray-500 bg-white/80 backdrop-blur-sm px-2 py-1 rounded border border-gray-300 z-50">
      {versionInfo.version}
    </div>
  )
}
