const { activeStore, setActiveStore } = useStore();

<select
  value={activeStore}
  onChange={(e) => setActiveStore(e.target.value)}
  className="border rounded-lg p-2 text-sm"
>
  <option>All</option>
  <option>Main Branch</option>
  <option>San Fernando</option>
</select>