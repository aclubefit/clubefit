export default function Logo({ small }) {
  return (
    <div className={small ? 'logo logo-sm' : 'logo'}>
      <span className="logo-main">CLUBE<b>FIT</b></span>
      <span className="logo-sub">ACADEMIA IN CESC</span>
    </div>
  )
}
