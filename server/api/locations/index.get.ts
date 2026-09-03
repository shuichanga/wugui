import { getLocationTree } from '~/server/utils/locations'

// 返回当前家庭的完整位置树
export default defineEventHandler(async (event) => {
  const { householdId } = await requireHousehold(event)
  const db = getDB(event)
  return getLocationTree(db, householdId)
})
