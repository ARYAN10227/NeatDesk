import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { CreateOrganization, SignIn, useAuth, useUser, useOrganization, useOrganizationList } from '@clerk/clerk-react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchWorkspaces } from '../features/workspaceSlice'
import { loadTheme } from '../features/themeSlice'
import { Loader2Icon } from 'lucide-react'
import DemoSignIn from '../components/DemoSignIn'

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { user, isLoaded } = useUser()
    const { organization, isLoaded: isOrgLoaded } = useOrganization()
    const { userMemberships, setActive, isLoaded: isListLoaded } = useOrganizationList({ userMemberships: true })
    const { loading } = useSelector((state) => state.workspace)
    const { getToken } = useAuth()
    const dispatch = useDispatch()

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [])

    // Load workspaces whenever the user or active Clerk organization changes
    useEffect(() => {
        if (isLoaded && user && organization) {
            dispatch(fetchWorkspaces({ getToken }))
        }
    }, [isLoaded, user, organization?.id])

    // Signed in and already in a workspace, but none is active (e.g. a fresh sign-in): open the first one
    // instead of asking the user to create a new workspace.
    const firstOrgId = userMemberships?.data?.[0]?.organization?.id
    useEffect(() => {
        if (user && isOrgLoaded && !organization && firstOrgId) {
            setActive({ organization: firstOrgId })
        }
    }, [user, isOrgLoaded, organization, firstOrgId, setActive])

    if (!isLoaded) {
        return (
            <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col lg:flex-row justify-center items-center gap-8 p-6 bg-white dark:bg-zinc-950">
                <DemoSignIn />
                <SignIn />
            </div>
        )
    }

    if (!organization && (!isOrgLoaded || !isListLoaded || firstOrgId)) {
        return (
            <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
                <Loader2Icon className="size-7 text-blue-500 animate-spin" />
            </div>
        )
    }

    if (!organization) {
        return (
            <div className="min-h-screen flex justify-center items-center">
                <CreateOrganization />
            </div>
        )
    }

    if (loading) return (
        <div className='flex items-center justify-center h-screen bg-white dark:bg-zinc-950'>
            <Loader2Icon className="size-7 text-blue-500 animate-spin" />
        </div>
    )

    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default Layout