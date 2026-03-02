/**
 * AppLayout — Layout principal da aplicação autenticada
 */
import { Outlet } from 'react-router-dom'
import { styled } from '@/styles/stitches.config'
import Sidebar from './Sidebar'

const Wrapper = styled('div', {
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: '$background',
})

const Main = styled('main', {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
})

const PageContent = styled('div', {
  flex: 1,
  px: '$6',
  py: '$6',
  maxWidth: '$maxPage',
  width: '100%',
  mx: 'auto',
})

export default function AppLayout() {
  return (
    <Wrapper>
      <Sidebar />
      <Main>
        <PageContent>
          <Outlet />
        </PageContent>
      </Main>
    </Wrapper>
  )
}
